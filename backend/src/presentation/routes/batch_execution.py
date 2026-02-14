from fastapi import APIRouter, Depends

from ...application.dto.requests import BatchExecuteRequest
from ...application.use_cases.batch_execution_operations import BatchExecutionOperations
from ...di import get_batch_execution_operations
from ..sse import sse_stream

router = APIRouter(prefix="/api/batch-executions", tags=["batch-execution"])


@router.post("/")
async def start_batch_execution(
    request: BatchExecuteRequest,
    ops: BatchExecutionOperations = Depends(get_batch_execution_operations),
):
    batch_id = await ops.start_batch(
        request.experiment_id, request.graph_ids, request.force,
    )
    return {
        "batch_id": batch_id,
        "stream_url": f"/api/batch-executions/{batch_id}/stream",
    }


@router.get("/{batch_id}/stream")
async def stream_batch_execution(
    batch_id: str,
    ops: BatchExecutionOperations = Depends(get_batch_execution_operations),
):
    return await sse_stream(ops.stream_batch(batch_id))


@router.delete("/{batch_id}")
async def cancel_batch_execution(
    batch_id: str,
    ops: BatchExecutionOperations = Depends(get_batch_execution_operations),
):
    await ops.cancel_batch(batch_id)
    return {"message": "Batch execution cancelled"}
