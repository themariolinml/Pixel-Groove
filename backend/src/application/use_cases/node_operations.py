"""Node CRUD operations — split from GraphOperations for single responsibility."""

import logging
from typing import Dict, Tuple

from ...core.exceptions import NodeNotFoundError
from ...core.utils.id_generator import generate_id
from ...domain.models.graph import Node, NodeStatus, NodeType, Position
from ...domain.ports import GraphRepositoryPort, StoragePort
from ._helpers import get_graph_or_raise

logger = logging.getLogger(__name__)


class NodeOperations:
    """CRUD operations for nodes within a graph."""

    def __init__(self, repo: GraphRepositoryPort, storage: StoragePort):
        self._repo = repo
        self._storage = storage

    async def create_node(
        self,
        graph_id: str,
        node_type: str,
        label: str,
        params: Dict,
        position: Tuple[float, float],
        provider: str = "gemini",
    ) -> Node:
        graph = await get_graph_or_raise(self._repo, graph_id)
        node = Node(
            id=generate_id(),
            type=NodeType(node_type),
            label=label,
            params=params,
            position=Position(x=position[0], y=position[1]),
            provider=provider,
        )
        graph.add_node(node)
        await self._repo.save(graph)
        return node

    async def update_node(self, graph_id: str, node_id: str, updates: Dict) -> Node:
        graph = await get_graph_or_raise(self._repo, graph_id)
        node = graph.get_node(node_id)
        if not node:
            raise NodeNotFoundError(node_id)

        has_content_change = False
        if "params" in updates:
            new_params = updates["params"]
            if "prompt" in new_params:
                new_params["human_edited"] = True
            node.params.update(new_params)
            has_content_change = True
        if "position" in updates:
            x, y = updates["position"]
            node.position = Position(x=x, y=y)
        if "label" in updates:
            node.label = updates["label"]
            has_content_change = True

        if has_content_change:
            graph.mark_stale(node_id)

        await self._repo.save(graph)
        return node

    async def delete_node(self, graph_id: str, node_id: str) -> None:
        graph = await get_graph_or_raise(self._repo, graph_id)
        graph.remove_node(node_id)
        await self._storage.delete_node_media(node_id)
        await self._repo.save(graph)

    async def regenerate_node(
        self, graph_id: str, node_id: str, create_variant: bool = True
    ) -> Node:
        graph = await get_graph_or_raise(self._repo, graph_id)
        node = graph.get_node(node_id)
        if not node:
            raise NodeNotFoundError(node_id)

        if not create_variant:
            node.result = None

        node.status = NodeStatus.IDLE
        node.error_message = None
        await self._repo.save(graph)
        return node
