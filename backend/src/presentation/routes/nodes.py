from fastapi import APIRouter, Depends

from ...application.dto.mappers import node_to_dto
from ...application.dto.requests import CreateNodeRequest, UpdateNodeRequest
from ...application.dto.responses import NodeDTO
from ...application.use_cases.node_operations import NodeOperations
from ...di import get_node_operations

router = APIRouter(prefix="/api/graphs/{graph_id}/nodes", tags=["nodes"])


@router.post("/", response_model=NodeDTO)
async def create_node(
    graph_id: str,
    request: CreateNodeRequest,
    ops: NodeOperations = Depends(get_node_operations),
):
    node = await ops.create_node(
        graph_id=graph_id,
        node_type=request.type,
        label=request.label,
        params=request.params,
        position=(request.position.x, request.position.y),
        provider=request.provider,
    )
    return node_to_dto(node)


@router.patch("/{node_id}", response_model=NodeDTO)
async def update_node(
    graph_id: str,
    node_id: str,
    request: UpdateNodeRequest,
    ops: NodeOperations = Depends(get_node_operations),
):
    updates = {}
    if request.params is not None:
        updates["params"] = request.params
    if request.position is not None:
        updates["position"] = (request.position.x, request.position.y)
    if request.label is not None:
        updates["label"] = request.label

    node = await ops.update_node(graph_id, node_id, updates)
    return node_to_dto(node)


@router.delete("/{node_id}")
async def delete_node(
    graph_id: str,
    node_id: str,
    ops: NodeOperations = Depends(get_node_operations),
):
    await ops.delete_node(graph_id, node_id)
    return {"message": "Node deleted"}


@router.post("/{node_id}/regenerate", response_model=NodeDTO)
async def regenerate_node(
    graph_id: str,
    node_id: str,
    create_variant: bool = True,
    ops: NodeOperations = Depends(get_node_operations),
):
    node = await ops.regenerate_node(graph_id, node_id, create_variant)
    return node_to_dto(node)
