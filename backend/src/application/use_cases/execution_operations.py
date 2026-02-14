import asyncio
import logging
from typing import AsyncGenerator, Dict

from ...core.exceptions import ExecutionError
from ...core.utils.id_generator import generate_id
from ...domain.models.execution import ExecutionContext, ExecutionStatus
from ...domain.ports import CanvasMemoryPort, GraphRepositoryPort
from ...domain.services.graph_executor import GraphExecutor
from ._helpers import get_graph_or_raise

logger = logging.getLogger(__name__)


class ExecutionOperations:
    """Start, stream, and cancel graph executions."""

    def __init__(
        self,
        graph_executor: GraphExecutor,
        repo: GraphRepositoryPort,
        memory: CanvasMemoryPort,
    ):
        self._executor = graph_executor
        self._repo = repo
        self._memory = memory
        # Active executions keyed by execution_id
        self._contexts: Dict[str, ExecutionContext] = {}
        self._queues: Dict[str, asyncio.Queue] = {}

    async def start_execution(self, graph_id: str, output_node_ids: list[str], force: bool = False) -> str:
        graph = await get_graph_or_raise(self._repo, graph_id)

        execution_id = generate_id()
        context = ExecutionContext(
            execution_id=execution_id,
            graph_id=graph_id,
            output_node_ids=output_node_ids,
            force=force,
        )
        self._contexts[execution_id] = context
        self._queues[execution_id] = asyncio.Queue()

        # Run execution in background, push events to the queue
        asyncio.create_task(self._run(graph, context))
        return execution_id

    async def _run(self, graph, context: ExecutionContext) -> None:
        queue = self._queues[context.execution_id]
        try:
            # Resolve canvas memory once before execution starts
            canvas_memory = await self._memory.resolve(graph)
            async for event in self._executor.execute(graph, context, canvas_memory):
                await queue.put({
                    "execution_id": event.execution_id,
                    "event_type": event.event_type,
                    "timestamp": event.timestamp,
                    "node_id": event.node_id,
                    "data": event.data,
                })
            # Save graph state after execution (nodes now have results)
            await self._repo.save(graph)
        except Exception as e:
            logger.error("Execution %s crashed: %s", context.execution_id, e)
            await queue.put({
                "execution_id": context.execution_id,
                "event_type": "failed",
                "timestamp": 0,
                "data": {"error": str(e)},
            })
        finally:
            # Sentinel to signal stream end
            await queue.put(None)

    async def stream_execution(self, execution_id: str) -> AsyncGenerator[Dict, None]:
        queue = self._queues.get(execution_id)
        if not queue:
            raise ExecutionError(f"No execution found: {execution_id}")

        while True:
            event = await queue.get()
            if event is None:
                break
            yield event

        # Cleanup
        self._queues.pop(execution_id, None)
        self._contexts.pop(execution_id, None)

    async def cancel_execution(self, execution_id: str) -> None:
        context = self._contexts.get(execution_id)
        if context:
            context.cancelled = True
