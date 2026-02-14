import asyncio
import logging
import time
from typing import Any, AsyncGenerator, Dict, List, Optional

from ..models.execution import ExecutionContext, ExecutionEvent, ExecutionStatus
from ..models.graph import Graph, NodeStatus
from ..ports import StoragePort
from .graph_utils import get_required_nodes, topological_sort, topological_levels
from .input_resolver import InputResolver
from .node_executor import NodeExecutor

logger = logging.getLogger(__name__)


class GraphExecutor:
    """Runs a graph by executing nodes in topological order, yielding progress events."""

    def __init__(self, node_executor: NodeExecutor, storage: StoragePort, input_resolver: InputResolver):
        self._node_executor = node_executor
        self._storage = storage
        self._input_resolver = input_resolver

    async def execute(
        self, graph: Graph, context: ExecutionContext, canvas_memory: str = ""
    ) -> AsyncGenerator[ExecutionEvent, None]:
        context.status = ExecutionStatus.RUNNING
        yield self._event(context, "started")

        required = get_required_nodes(graph, context.output_node_ids)
        order = [nid for nid in topological_sort(graph) if nid in required]
        levels = topological_levels(graph, order)

        node_outputs: Dict[str, Any] = {}

        try:
            for level_nodes in levels:
                if context.cancelled:
                    context.status = ExecutionStatus.CANCELLED
                    yield self._event(context, "cancelled")
                    return

                # Separate skippable nodes from nodes that need execution
                to_run: List[str] = []
                for node_id in level_nodes:
                    node = graph.get_node(node_id)
                    if not node:
                        continue
                    if not context.force and not node.stale and node.status == NodeStatus.COMPLETED and node.result is not None:
                        node_outputs[node_id] = node.result
                        yield self._event(
                            context, "node_skipped", node_id=node_id,
                            data={"reason": "already completed"},
                        )
                    else:
                        to_run.append(node_id)

                if not to_run:
                    continue

                # Emit start events and launch tasks
                tasks: Dict[str, asyncio.Task] = {}
                for node_id in to_run:
                    node = graph.get_node(node_id)
                    node.status = NodeStatus.RUNNING
                    yield self._event(context, "node_started", node_id=node_id)

                    input_data = await self._input_resolver.resolve(graph, node_id, node_outputs)
                    tasks[node_id] = asyncio.create_task(
                        self._node_executor.execute(node, input_data, canvas_memory)
                    )

                # Await all tasks concurrently
                results = await asyncio.gather(*tasks.values(), return_exceptions=True)

                has_failure = False
                for node_id, result in zip(tasks.keys(), results):
                    node = graph.get_node(node_id)
                    if isinstance(result, Exception):
                        logger.error("Node %s failed: %s", node_id, result)
                        node.status = NodeStatus.FAILED
                        node.error_message = str(result)
                        yield self._event(
                            context, "node_failed", node_id=node_id,
                            data={"error": str(result)},
                        )
                        has_failure = True
                    else:
                        node.add_generation(result)
                        node_outputs[node_id] = result
                        yield self._event(
                            context, "node_completed", node_id=node_id,
                            data={
                                "media_type": result.media_type.value,
                                "urls": {
                                    "original": result.urls.original,
                                    "thumbnail": result.urls.thumbnail,
                                },
                            },
                        )

                if has_failure:
                    context.status = ExecutionStatus.FAILED
                    yield self._event(context, "failed", data={"error": "One or more nodes failed"})
                    return

            context.status = ExecutionStatus.COMPLETED
            yield self._event(context, "completed")

        except Exception as e:
            logger.error("Graph execution failed: %s", e)
            context.status = ExecutionStatus.FAILED
            yield self._event(context, "failed", data={"error": str(e)})

    def _event(
        self,
        context: ExecutionContext,
        event_type: str,
        node_id: Optional[str] = None,
        data: Optional[Dict] = None,
    ) -> ExecutionEvent:
        event = ExecutionEvent(
            execution_id=context.execution_id,
            event_type=event_type,
            timestamp=int(time.time()),
            node_id=node_id,
            data=data,
        )
        context.events.append(event)
        return event
