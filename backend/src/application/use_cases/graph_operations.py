"""Graph-level CRUD operations (create, read, update, delete, duplicate)."""

import copy
import logging
from typing import Dict, List

from ...core.exceptions import GraphNotFoundError
from ...core.utils.id_generator import generate_id
from ...domain.models.graph import Edge, Graph, Node, Position
from ...domain.models.media import MediaUrls
from ...domain.ports import GraphRepositoryPort, StoragePort

logger = logging.getLogger(__name__)


class GraphOperations:
    """CRUD operations for graphs."""

    def __init__(self, repo: GraphRepositoryPort, storage: StoragePort):
        self._repo = repo
        self._storage = storage

    async def create_graph(self, name: str) -> Graph:
        graph = Graph(id=generate_id(), name=name)
        await self._repo.save(graph)
        return graph

    async def get_graph(self, graph_id: str) -> Graph:
        graph = await self._repo.load(graph_id)
        if not graph:
            raise GraphNotFoundError(graph_id)
        return graph

    async def list_graphs(self) -> List[Graph]:
        return await self._repo.list_all()

    async def update_graph(self, graph_id: str, name: str | None = None, canvas_memory: str | None = None) -> Graph:
        graph = await self.get_graph(graph_id)
        if name is not None:
            graph.name = name
        if canvas_memory is not None:
            graph.canvas_memory = canvas_memory
        await self._repo.save(graph)
        return graph

    async def delete_graph(self, graph_id: str) -> None:
        graph = await self.get_graph(graph_id)
        for node_id in graph.nodes:
            await self._storage.delete_node_media(node_id)
        await self._repo.delete(graph_id)

    async def duplicate_graph(self, graph_id: str) -> Graph:
        """Deep-copy a graph: new IDs for graph/nodes/edges, copy media files."""
        source = await self.get_graph(graph_id)

        new_graph_id = generate_id()
        # Build old_node_id -> new_node_id mapping
        node_id_map: Dict[str, str] = {}
        for old_id in source.nodes:
            node_id_map[old_id] = generate_id()

        # Deep-copy nodes with new IDs and remapped port IDs
        new_nodes: Dict[str, Node] = {}
        for old_id, old_node in source.nodes.items():
            new_id = node_id_map[old_id]

            # Remap port IDs (they embed the node ID)
            new_input_ports = []
            for p in old_node.input_ports:
                new_p = copy.deepcopy(p)
                new_p.id = p.id.replace(old_id, new_id, 1)
                new_input_ports.append(new_p)

            new_output_ports = []
            for p in old_node.output_ports:
                new_p = copy.deepcopy(p)
                new_p.id = p.id.replace(old_id, new_id, 1)
                new_output_ports.append(new_p)

            # Copy media files and remap URLs in results
            def _remap_media_urls(urls: MediaUrls) -> MediaUrls:
                return MediaUrls(
                    original=urls.original.replace(f"/media/{old_id}/", f"/media/{new_id}/") if urls.original.startswith("/media/") else urls.original,
                    thumbnail=urls.thumbnail.replace(f"/media/{old_id}/", f"/media/{new_id}/") if urls.thumbnail.startswith("/media/") else urls.thumbnail,
                )

            new_result = None
            if old_node.result:
                new_result = copy.deepcopy(old_node.result)
                new_result.urls = _remap_media_urls(new_result.urls)

            new_history = []
            for r in old_node.generation_history:
                nr = copy.deepcopy(r)
                nr.urls = _remap_media_urls(nr.urls)
                new_history.append(nr)

            # Copy media files via storage port
            await self._storage.duplicate_node_media(old_id, new_id)

            new_node = Node(
                id=new_id,
                type=old_node.type,
                label=old_node.label,
                params=copy.deepcopy(old_node.params),
                position=Position(x=old_node.position.x, y=old_node.position.y),
                provider=old_node.provider,
                status=old_node.status,
                input_ports=new_input_ports,
                output_ports=new_output_ports,
                result=new_result,
                generation_history=new_history,
                error_message=old_node.error_message,
                stale=old_node.stale,
            )
            new_nodes[new_id] = new_node

        # Build port ID mapping for edges
        port_id_map: Dict[str, str] = {}
        for old_id, new_id in node_id_map.items():
            source_node = source.nodes[old_id]
            for p in source_node.input_ports:
                port_id_map[p.id] = p.id.replace(old_id, new_id, 1)
            for p in source_node.output_ports:
                port_id_map[p.id] = p.id.replace(old_id, new_id, 1)

        # Deep-copy edges with remapped IDs
        new_edges: List[Edge] = []
        for old_edge in source.edges:
            c = old_edge.connection
            new_edge = Edge.from_ports(
                from_node_id=node_id_map[c.from_node_id],
                from_port_id=port_id_map[c.from_port_id],
                to_node_id=node_id_map[c.to_node_id],
                to_port_id=port_id_map[c.to_port_id],
            )
            new_edges.append(new_edge)

        new_graph = Graph(
            id=new_graph_id,
            name=f"{source.name} (Copy)",
            canvas_memory=source.canvas_memory,
            nodes=new_nodes,
            edges=new_edges,
        )
        await self._repo.save(new_graph)
        return new_graph
