from fastapi import APIRouter, Depends
from typing import List

from ...application.dto.mappers import edge_to_dto, graph_to_dto
from ...application.dto.requests import CreateEdgeRequest, CreateGraphRequest, UpdateGraphRequest
from ...application.dto.responses import EdgeDTO, GraphDTO
from ...application.use_cases.edge_operations import EdgeOperations
from ...application.use_cases.graph_operations import GraphOperations
from ...di import get_edge_operations, get_graph_operations

router = APIRouter(prefix="/api/graphs", tags=["graphs"])


# -- Routes --

@router.post("/", response_model=GraphDTO)
async def create_graph(
    request: CreateGraphRequest,
    ops: GraphOperations = Depends(get_graph_operations),
):
    graph = await ops.create_graph(request.name)
    return graph_to_dto(graph)


@router.get("/", response_model=List[GraphDTO])
async def list_graphs(ops: GraphOperations = Depends(get_graph_operations)):
    graphs = await ops.list_graphs()
    return [graph_to_dto(g) for g in graphs]


@router.get("/{graph_id}", response_model=GraphDTO)
async def get_graph(graph_id: str, ops: GraphOperations = Depends(get_graph_operations)):
    graph = await ops.get_graph(graph_id)
    return graph_to_dto(graph)


@router.patch("/{graph_id}", response_model=GraphDTO)
async def update_graph(
    graph_id: str,
    request: UpdateGraphRequest,
    ops: GraphOperations = Depends(get_graph_operations),
):
    graph = await ops.update_graph(graph_id, name=request.name, canvas_memory=request.canvas_memory)
    return graph_to_dto(graph)


@router.delete("/{graph_id}")
async def delete_graph(graph_id: str, ops: GraphOperations = Depends(get_graph_operations)):
    await ops.delete_graph(graph_id)
    return {"message": "Graph deleted"}


@router.post("/{graph_id}/duplicate", response_model=GraphDTO)
async def duplicate_graph(graph_id: str, ops: GraphOperations = Depends(get_graph_operations)):
    graph = await ops.duplicate_graph(graph_id)
    return graph_to_dto(graph)


# -- Edge endpoints (nested under graph) --

@router.post("/{graph_id}/edges", response_model=EdgeDTO)
async def create_edge(
    graph_id: str,
    request: CreateEdgeRequest,
    ops: EdgeOperations = Depends(get_edge_operations),
):
    edge = await ops.create_edge(
        graph_id, request.from_node_id, request.from_port_id,
        request.to_node_id, request.to_port_id,
    )
    return edge_to_dto(edge)


@router.delete("/{graph_id}/edges/{edge_id}")
async def delete_edge(
    graph_id: str,
    edge_id: str,
    ops: EdgeOperations = Depends(get_edge_operations),
):
    await ops.delete_edge(graph_id, edge_id)
    return {"message": "Edge deleted"}
