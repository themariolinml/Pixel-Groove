"""Start, stream, and cancel batch (multi-graph) executions."""

import asyncio
import logging
from typing import AsyncGenerator, Dict, List

from ...core.utils.id_generator import generate_id
from ...domain.models.batch_execution import (
    BatchContext,
    GraphOutcome,
    SchedulableNode,
)
from ...domain.ports import CanvasMemoryPort, GraphRepositoryPort
from ...domain.services.batch_scheduler import BatchScheduler
from ...domain.services.graph_utils import get_required_nodes
from ._helpers import get_graph_or_raise

logger = logging.getLogger(__name__)


class BatchExecutionOperations:
    """Orchestrates batch execution of multiple graphs via the global scheduler."""

    def __init__(
        self,
        batch_scheduler: BatchScheduler,
        graph_repo: GraphRepositoryPort,
        memory: CanvasMemoryPort,
    ):
        self._scheduler = batch_scheduler
        self._graph_repo = graph_repo
        self._memory = memory
        self._contexts: Dict[str, BatchContext] = {}
        self._queues: Dict[str, asyncio.Queue] = {}

    async def start_batch(
        self,
        experiment_id: str,
        graph_ids: List[str],
        force: bool = False,
    ) -> str:
        """Load all graphs, build SchedulableNodes, start the scheduler.

        Returns the batch_id for streaming and cancellation.
        """
        batch_id = generate_id()

        # Load all graphs
        graphs = {}
        for gid in graph_ids:
            graph = await get_graph_or_raise(self._graph_repo, gid)
            graphs[gid] = graph

        # Resolve canvas memory for each graph
        canvas_memories: Dict[str, str] = {}
        for gid, graph in graphs.items():
            canvas_memories[gid] = await self._memory.resolve(graph)

        # Flatten all graphs into a single pool of SchedulableNodes
        schedulable_nodes: List[SchedulableNode] = []
        for gid, graph in graphs.items():
            all_node_ids = list(graph.nodes.keys())
            required = get_required_nodes(graph, all_node_ids)

            for node_id in required:
                node = graph.get_node(node_id)
                if not node:
                    continue
                deps = set(graph.get_dependencies(node_id)) & required
                schedulable_nodes.append(SchedulableNode(
                    node_id=node_id,
                    graph_id=gid,
                    node_type=node.type,
                    dependencies=deps,
                    node=node,
                    graph=graph,
                    canvas_memory=canvas_memories[gid],
                ))

        context = BatchContext(
            batch_id=batch_id,
            experiment_id=experiment_id,
            graph_ids=graph_ids,
            force=force,
            graph_outcomes={gid: GraphOutcome.PENDING for gid in graph_ids},
        )
        self._contexts[batch_id] = context
        self._queues[batch_id] = asyncio.Queue()

        asyncio.create_task(self._run(schedulable_nodes, graphs, context))
        return batch_id

    async def _run(
        self,
        nodes: List[SchedulableNode],
        graphs: Dict,
        context: BatchContext,
    ) -> None:
        queue = self._queues[context.batch_id]
        try:
            async for event in self._scheduler.execute(nodes, context):
                await queue.put({
                    "batch_id": event.batch_id,
                    "event_type": event.event_type,
                    "timestamp": event.timestamp,
                    "graph_id": event.graph_id,
                    "node_id": event.node_id,
                    "data": event.data,
                })

                # Save graph state when a graph completes or fails
                if event.event_type in ("graph_completed", "graph_failed"):
                    graph = graphs.get(event.graph_id)
                    if graph:
                        await self._graph_repo.save(graph)

        except Exception as e:
            logger.error("Batch %s crashed: %s", context.batch_id, e)
            await queue.put({
                "batch_id": context.batch_id,
                "event_type": "batch_failed",
                "timestamp": 0,
                "data": {"error": str(e)},
            })
        finally:
            # Save any remaining graphs
            for graph in graphs.values():
                try:
                    await self._graph_repo.save(graph)
                except Exception:
                    logger.error("Failed to save graph %s after batch", graph.id)
            await queue.put(None)  # sentinel

    async def stream_batch(self, batch_id: str) -> AsyncGenerator[Dict, None]:
        queue = self._queues.get(batch_id)
        if not queue:
            raise ValueError(f"No batch execution found: {batch_id}")

        while True:
            event = await queue.get()
            if event is None:
                break
            yield event

        self._queues.pop(batch_id, None)
        self._contexts.pop(batch_id, None)

    async def cancel_batch(self, batch_id: str) -> None:
        context = self._contexts.get(batch_id)
        if context:
            context.cancelled = True
