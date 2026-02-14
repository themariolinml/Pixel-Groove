from fastapi import APIRouter, Depends

from ...application.dto.requests import ExecuteGraphRequest
from ...application.use_cases.execution_operations import ExecutionOperations
from ...di import get_execution_operations
from ..sse import sse_stream

router = APIRouter(prefix="/api/executions", tags=["execution"])


@router.post("/")
async def start_execution(
    request: ExecuteGraphRequest,
    ops: ExecutionOperations = Depends(get_execution_operations),
):
    execution_id = await ops.start_execution(request.graph_id, request.output_node_ids, request.force)
    return {
        "execution_id": execution_id,
        "stream_url": f"/api/executions/{execution_id}/stream",
    }


@router.get("/{execution_id}/stream")
async def stream_execution(
    execution_id: str,
    ops: ExecutionOperations = Depends(get_execution_operations),
):
    return await sse_stream(ops.stream_execution(execution_id))


@router.delete("/{execution_id}")
async def cancel_execution(
    execution_id: str,
    ops: ExecutionOperations = Depends(get_execution_operations),
):
    await ops.cancel_execution(execution_id)
    return {"message": "Execution cancelled"}
