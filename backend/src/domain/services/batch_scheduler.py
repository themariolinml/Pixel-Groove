"""Global DAG-aware scheduler with per-type concurrency control.

Flattens multiple graphs into a single node pool and executes them
with dependency-aware scheduling, per-NodeType semaphores, and
per-graph failure isolation.
"""

import asyncio
import logging
import time
from typing import AsyncGenerator, Dict, List, Optional, Set

from ..models.batch_execution import (
    BatchContext,
    BatchEvent,
    BatchStatus,
    DEFAULT_TYPE_CONFIGS,
    GraphOutcome,
    NodeTypeConfig,
    SchedulableNode,
)
from ..models.graph import NodeStatus, NodeType
from ..models.media import MediaResult
from .input_resolver import InputResolver
from .node_executor import NodeExecutor

logger = logging.getLogger(__name__)


class BatchScheduler:
    """Event-driven scheduler that executes nodes from multiple graphs
    in a single global pool with per-type concurrency control.
    """

    def __init__(
        self,
        node_executor: NodeExecutor,
        input_resolver: InputResolver,
        type_configs: Dict[NodeType, NodeTypeConfig] | None = None,
    ):
        self._node_executor = node_executor
        self._input_resolver = input_resolver
        self._type_configs = type_configs or DEFAULT_TYPE_CONFIGS

    async def execute(
        self,
        nodes: List[SchedulableNode],
        context: BatchContext,
    ) -> AsyncGenerator[BatchEvent, None]:
        """Schedule and execute all nodes with concurrency control.

        Yields BatchEvent instances as nodes start, complete, or fail.
        """
        if not nodes:
            context.status = BatchStatus.COMPLETED
            yield self._event(context, "batch_started", data={"graph_ids": context.graph_ids, "total_nodes": 0})
            yield self._event(context, "batch_completed", data={"graph_outcomes": {}})
            return

        context.status = BatchStatus.RUNNING
        yield self._event(context, "batch_started", data={
            "graph_ids": context.graph_ids,
            "total_nodes": len(nodes),
        })

        # --- Internal state ---
        state = _SchedulerState(nodes, context, self._type_configs)
        event_queue: asyncio.Queue[BatchEvent | None] = asyncio.Queue()

        # --- Pre-process: skip already-completed nodes ---
        for sn in nodes:
            if self._is_skippable(sn, context.force):
                state.mark_skipped(sn)
                yield self._event(
                    context, "node_skipped", graph_id=sn.graph_id,
                    node_id=sn.node_id, data={"reason": "already completed"},
                )

        # --- Spawn initial ready nodes ---
        initial_ready = state.get_ready_nodes()
        for sn in initial_ready:
            state.mark_launched(sn.node_id)
            task = asyncio.create_task(
                self._run_node(sn, state, context, event_queue)
            )
            state.track_task(task)

        if state.remaining == 0:
            # All nodes were skipped — emit completions and return
            for gid in context.graph_ids:
                if state.is_graph_complete(gid):
                    context.graph_outcomes[gid] = GraphOutcome.COMPLETED
                    yield self._event(context, "graph_completed", graph_id=gid)
            context.status = BatchStatus.COMPLETED
            yield self._event(context, "batch_completed", data={
                "graph_outcomes": {
                    gid: context.graph_outcomes.get(gid, GraphOutcome.COMPLETED).value
                    for gid in context.graph_ids
                },
            })
            return

        # --- Drain events from worker tasks ---
        while True:
            event = await event_queue.get()
            if event is None:
                break
            yield event

        # --- Emit terminal batch event ---
        if context.cancelled:
            context.status = BatchStatus.CANCELLED
            yield self._event(context, "batch_cancelled")
        else:
            context.status = BatchStatus.COMPLETED
            yield self._event(context, "batch_completed", data={
                "graph_outcomes": {
                    gid: context.graph_outcomes.get(gid, GraphOutcome.PENDING).value
                    for gid in context.graph_ids
                },
            })

    async def _run_node(
        self,
        sn: SchedulableNode,
        state: "_SchedulerState",
        context: BatchContext,
        event_queue: asyncio.Queue,
    ) -> None:
        """Execute a single node: acquire semaphore, run, promote children."""
        sem = state.get_semaphore(sn.node_type)
        try:
            async with sem:
                if context.cancelled or state.is_graph_failed(sn.graph_id):
                    return

                sn.node.status = NodeStatus.RUNNING
                await event_queue.put(self._event(
                    context, "node_started",
                    graph_id=sn.graph_id, node_id=sn.node_id,
                ))

                input_data = await self._input_resolver.resolve(
                    sn.graph, sn.node_id, state.node_results,
                )
                result = await self._node_executor.execute(
                    sn.node, input_data, sn.canvas_memory,
                )

                sn.node.add_generation(result)
                state.mark_completed(sn, result)

                await event_queue.put(self._event(
                    context, "node_completed",
                    graph_id=sn.graph_id, node_id=sn.node_id,
                    data={
                        "media_type": result.media_type.value,
                        "urls": {
                            "original": result.urls.original,
                            "thumbnail": result.urls.thumbnail,
                        },
                    },
                ))

                # Check if this graph just completed
                if state.is_graph_complete(sn.graph_id):
                    context.graph_outcomes[sn.graph_id] = GraphOutcome.COMPLETED
                    await event_queue.put(self._event(
                        context, "graph_completed", graph_id=sn.graph_id,
                    ))

                # Promote ready children
                ready_children = state.promote_children(sn.node_id)
                for child_sn in ready_children:
                    task = asyncio.create_task(
                        self._run_node(child_sn, state, context, event_queue)
                    )
                    state.track_task(task)

        except Exception as e:
            logger.error("Node %s (graph %s) failed: %s", sn.node_id, sn.graph_id, e, exc_info=True)
            sn.node.status = NodeStatus.FAILED
            sn.node.error_message = str(e)

            state.mark_graph_failed(sn)
            context.graph_outcomes[sn.graph_id] = GraphOutcome.FAILED

            await event_queue.put(self._event(
                context, "node_failed",
                graph_id=sn.graph_id, node_id=sn.node_id,
                data={"error": str(e)},
            ))
            await event_queue.put(self._event(
                context, "graph_failed",
                graph_id=sn.graph_id, data={"error": str(e)},
            ))

        finally:
            state.decrement_remaining()
            if state.remaining == 0:
                await event_queue.put(None)  # sentinel: all work done

    @staticmethod
    def _is_skippable(sn: SchedulableNode, force: bool) -> bool:
        node = sn.node
        return (
            not force
            and not node.stale
            and node.status == NodeStatus.COMPLETED
            and node.result is not None
        )

    @staticmethod
    def _event(
        context: BatchContext,
        event_type: str,
        graph_id: str | None = None,
        node_id: str | None = None,
        data: dict | None = None,
    ) -> BatchEvent:
        return BatchEvent(
            batch_id=context.batch_id,
            event_type=event_type,
            timestamp=int(time.time()),
            graph_id=graph_id,
            node_id=node_id,
            data=data,
        )


class _SchedulerState:
    """Encapsulates mutable scheduler state to keep BatchScheduler clean.

    All state mutations are centralized here for thread-safety reasoning
    (single-threaded asyncio event loop — mutations between awaits are atomic).
    """

    def __init__(
        self,
        nodes: List[SchedulableNode],
        context: BatchContext,
        type_configs: Dict[NodeType, NodeTypeConfig],
    ):
        self._node_map: Dict[str, SchedulableNode] = {sn.node_id: sn for sn in nodes}
        self._type_configs = type_configs

        # Dependency tracking
        self._pending_deps: Dict[str, int] = {}
        self._children: Dict[str, Set[str]] = {sn.node_id: set() for sn in nodes}
        for sn in nodes:
            valid_deps = sn.dependencies & set(self._node_map.keys())
            self._pending_deps[sn.node_id] = len(valid_deps)
            for dep_id in valid_deps:
                self._children[dep_id].add(sn.node_id)

        # Per-graph node counts for completion detection
        self._graph_total: Dict[str, int] = {}
        self._graph_done: Dict[str, int] = {}
        for sn in nodes:
            self._graph_total[sn.graph_id] = self._graph_total.get(sn.graph_id, 0) + 1
            self._graph_done.setdefault(sn.graph_id, 0)

        # Result storage
        self.node_results: Dict[str, MediaResult] = {}

        # Tracking sets
        self._finished: Set[str] = set()   # completed or skipped node IDs
        self._launched: Set[str] = set()   # node IDs that have been dispatched
        self._failed_graphs: Set[str] = set()

        # Concurrency semaphores
        self._semaphores: Dict[NodeType, asyncio.Semaphore] = {
            nt: asyncio.Semaphore(cfg.max_concurrency)
            for nt, cfg in type_configs.items()
        }
        self._default_semaphore = asyncio.Semaphore(4)

        # Active tasks + remaining counter
        self._active_tasks: Set[asyncio.Task] = set()
        self._remaining = len(nodes)

    @property
    def remaining(self) -> int:
        return self._remaining

    def get_semaphore(self, node_type: NodeType) -> asyncio.Semaphore:
        return self._semaphores.get(node_type, self._default_semaphore)

    def mark_skipped(self, sn: SchedulableNode) -> None:
        """Mark a node as skipped (already completed). Decrements children deps."""
        self.node_results[sn.node_id] = sn.node.result
        self._finished.add(sn.node_id)
        self._launched.add(sn.node_id)
        self._graph_done[sn.graph_id] = self._graph_done.get(sn.graph_id, 0) + 1
        self._remaining -= 1

        for child_id in self._children.get(sn.node_id, set()):
            self._pending_deps[child_id] -= 1

    def mark_launched(self, node_id: str) -> None:
        self._launched.add(node_id)

    def mark_completed(self, sn: SchedulableNode, result: MediaResult) -> None:
        self.node_results[sn.node_id] = result
        self._finished.add(sn.node_id)
        self._graph_done[sn.graph_id] = self._graph_done.get(sn.graph_id, 0) + 1

    def mark_graph_failed(self, sn: SchedulableNode) -> None:
        """Mark a node's graph as failed, finishing all its remaining nodes."""
        self._finished.add(sn.node_id)
        self._failed_graphs.add(sn.graph_id)

        # Count all un-finished nodes in this graph as done (they won't execute)
        for nid, other_sn in self._node_map.items():
            if other_sn.graph_id == sn.graph_id and nid not in self._finished:
                self._finished.add(nid)
                self._graph_done[sn.graph_id] = self._graph_done.get(sn.graph_id, 0) + 1
                self._remaining -= 1

    def is_graph_failed(self, graph_id: str) -> bool:
        return graph_id in self._failed_graphs

    def is_graph_complete(self, graph_id: str) -> bool:
        return self._graph_done.get(graph_id, 0) >= self._graph_total.get(graph_id, 0)

    def get_ready_nodes(self) -> List[SchedulableNode]:
        """Find all nodes with zero pending deps that haven't been launched."""
        ready = []
        for node_id, count in self._pending_deps.items():
            if (count <= 0
                    and node_id not in self._launched
                    and self._node_map[node_id].graph_id not in self._failed_graphs):
                ready.append(self._node_map[node_id])

        # Sort by priority (higher = first)
        ready.sort(key=lambda sn: self._get_priority(sn.node_type), reverse=True)
        return ready

    def promote_children(self, parent_id: str) -> List[SchedulableNode]:
        """Decrement deps for children of a completed node. Return newly ready ones."""
        newly_ready: List[SchedulableNode] = []
        for child_id in self._children.get(parent_id, set()):
            self._pending_deps[child_id] -= 1
            if (self._pending_deps[child_id] <= 0
                    and child_id not in self._launched
                    and self._node_map[child_id].graph_id not in self._failed_graphs):
                self._launched.add(child_id)
                newly_ready.append(self._node_map[child_id])
        return newly_ready

    def track_task(self, task: asyncio.Task) -> None:
        self._active_tasks.add(task)
        task.add_done_callback(self._active_tasks.discard)

    def decrement_remaining(self) -> None:
        self._remaining -= 1

    def _get_priority(self, node_type: NodeType) -> int:
        cfg = self._type_configs.get(node_type)
        return cfg.priority if cfg else 0
