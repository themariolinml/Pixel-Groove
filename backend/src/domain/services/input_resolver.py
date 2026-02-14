"""Resolves upstream node data for a node's input ports."""

from typing import Any, Dict, List, Optional

from ..models.graph import Graph
from ..models.media import MediaResult, MediaType
from ..ports import StoragePort


class InputResolver:
    """Resolves a node's input data from its upstream node results."""

    def __init__(self, storage: StoragePort):
        self._storage = storage

    async def resolve(
        self, graph: Graph, node_id: str, node_results: Dict[str, MediaResult]
    ) -> Dict[str, List[Any]]:
        """Collect data from ALL upstream nodes connected to this node's input ports.

        Multiple edges can connect to the same port. Same-type inputs are collected
        as lists so executors can use all of them (e.g. multiple images -> text node).
        """
        input_data: Dict[str, List[Any]] = {}
        node = graph.get_node(node_id)
        if not node:
            return input_data

        for port in node.input_ports:
            edges = [
                e for e in graph.edges
                if e.connection.to_node_id == node_id
                and e.connection.to_port_id == port.id
            ]
            for edge in edges:
                source_result = node_results.get(edge.connection.from_node_id)
                if not source_result:
                    continue

                if source_result.media_type == MediaType.IMAGE:
                    data = await self._read_result_bytes(source_result)
                    if data:
                        input_data.setdefault("images", []).append(data)
                elif source_result.media_type == MediaType.VIDEO:
                    data = await self._read_result_bytes(source_result)
                    if data:
                        input_data.setdefault("videos", []).append(data)
                elif source_result.media_type == MediaType.AUDIO:
                    data = await self._read_result_bytes(source_result)
                    if data:
                        input_data.setdefault("audios", []).append(data)
                else:
                    input_data.setdefault("texts", []).append(
                        source_result.urls.original
                    )

        return input_data

    async def _read_result_bytes(self, result: MediaResult) -> Optional[bytes]:
        """Read the original media file bytes via the storage port."""
        return await self._storage.read_media_bytes(result.urls.original)
