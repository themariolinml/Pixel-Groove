"""Centralized domain-model → DTO mapping functions."""

from ...domain.models.graph import Edge, Graph, Node
from ...domain.models.media import MediaResult
from .responses import (
    EdgeDTO,
    GraphDTO,
    MediaMetadataDTO,
    MediaResultDTO,
    MediaUrlsDTO,
    NodeDTO,
    PortDTO,
)


def node_to_dto(node: Node) -> NodeDTO:
    return NodeDTO(
        id=node.id,
        type=node.type.value,
        label=node.label,
        params=node.params,
        position={"x": node.position.x, "y": node.position.y},
        provider=node.provider,
        status=node.status.value,
        input_ports=[
            PortDTO(
                id=p.id, name=p.name, port_type=p.port_type.value,
                direction=p.direction.value, required=p.required, description=p.description,
            )
            for p in node.input_ports
        ],
        output_ports=[
            PortDTO(
                id=p.id, name=p.name, port_type=p.port_type.value,
                direction=p.direction.value, required=p.required, description=p.description,
            )
            for p in node.output_ports
        ],
        result=media_to_dto(node.result) if node.result else None,
        generation_history=[media_to_dto(r) for r in node.generation_history],
        error_message=node.error_message,
        stale=node.stale,
    )


def media_to_dto(m: MediaResult) -> MediaResultDTO:
    return MediaResultDTO(
        id=m.id,
        timestamp=m.timestamp,
        media_type=m.media_type.value,
        urls=MediaUrlsDTO(original=m.urls.original, thumbnail=m.urls.thumbnail),
        prompt=m.prompt,
        metadata=MediaMetadataDTO(
            width=m.metadata.width, height=m.metadata.height,
            duration=m.metadata.duration, format=m.metadata.format,
            size_bytes=m.metadata.size_bytes,
        ),
        generation_params=m.generation_params,
    )


def edge_to_dto(edge: Edge) -> EdgeDTO:
    return EdgeDTO(
        id=edge.id,
        from_node_id=edge.connection.from_node_id,
        from_port_id=edge.connection.from_port_id,
        to_node_id=edge.connection.to_node_id,
        to_port_id=edge.connection.to_port_id,
    )


def graph_to_dto(graph: Graph) -> GraphDTO:
    return GraphDTO(
        id=graph.id,
        name=graph.name,
        canvas_memory=graph.canvas_memory,
        created_at=graph.created_at,
        updated_at=graph.updated_at,
        nodes=[node_to_dto(n) for n in graph.nodes.values()],
        edges=[edge_to_dto(e) for e in graph.edges],
    )
