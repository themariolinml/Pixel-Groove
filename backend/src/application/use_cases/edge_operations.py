"""Edge CRUD operations — split from GraphOperations for single responsibility."""

import logging

from ...core.exceptions import GraphNotFoundError
from ...domain.models.graph import Edge
from ...domain.ports import GraphRepositoryPort

logger = logging.getLogger(__name__)


class EdgeOperations:
    """CRUD operations for edges within a graph."""

    def __init__(self, repo: GraphRepositoryPort):
        self._repo = repo

    async def _get_graph(self, graph_id: str):
        graph = await self._repo.load(graph_id)
        if not graph:
            raise GraphNotFoundError(graph_id)
        return graph

    async def create_edge(
        self,
        graph_id: str,
        from_node_id: str,
        from_port_id: str,
        to_node_id: str,
        to_port_id: str,
    ) -> Edge:
        graph = await self._get_graph(graph_id)
        edge = Edge.from_ports(from_node_id, from_port_id, to_node_id, to_port_id)
        graph.add_edge(edge)  # validates compatibility and cycles
        graph.mark_stale(to_node_id)
        await self._repo.save(graph)
        return edge

    async def delete_edge(self, graph_id: str, edge_id: str) -> None:
        graph = await self._get_graph(graph_id)
        # Find target node before removing the edge
        target_node_id = None
        for e in graph.edges:
            if e.id == edge_id:
                target_node_id = e.connection.to_node_id
                break
        graph.remove_edge(edge_id)
        if target_node_id:
            graph.mark_stale(target_node_id)
        await self._repo.save(graph)
