import asyncio

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from typing import List

from ...application.dto.experiment_mappers import experiment_to_dto
from ...application.dto.experiment_requests import (
    BuildHooksRequest,
    CreateExperimentRequest,
    GenerateGenomeRequest,
    UpdateExperimentConfigRequest,
    UpdateGenomeRequest,
    UpdateHookStatusRequest,
)
from ...application.dto.experiment_responses import ExperimentDTO
from ...application.use_cases.experiment_operations import ExperimentOperations
from ...di import get_experiment_operations

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("/", response_model=ExperimentDTO)
async def create_experiment(
    request: CreateExperimentRequest,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.create_experiment(request.name, request.brief)
    return experiment_to_dto(experiment)


@router.get("/", response_model=List[ExperimentDTO])
async def list_experiments(ops: ExperimentOperations = Depends(get_experiment_operations)):
    experiments = await ops.list_experiments()
    return [experiment_to_dto(e) for e in experiments]


@router.get("/{experiment_id}", response_model=ExperimentDTO)
async def get_experiment(
    experiment_id: str,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.get_experiment(experiment_id)
    return experiment_to_dto(experiment)


@router.post("/{experiment_id}/genome", response_model=ExperimentDTO)
async def generate_genome(
    experiment_id: str,
    request: GenerateGenomeRequest = GenerateGenomeRequest(),
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.generate_genome(experiment_id, brief=request.brief)
    return experiment_to_dto(experiment)


@router.put("/{experiment_id}/genome", response_model=ExperimentDTO)
async def update_genome(
    experiment_id: str,
    request: UpdateGenomeRequest,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    genome_data = {
        "dimensions": request.dimensions,
        "brief": request.brief,
        "goal": request.goal or "",
        "target_audience": request.target_audience or "",
        "platform": request.platform or "",
        "desired_outcome": request.desired_outcome or "",
        "reference_image_url": request.reference_image_url or "",
        "reference_image_usage": request.reference_image_usage or "",
        "required_assets": request.required_assets or [],
    }
    experiment = await ops.update_genome(experiment_id, genome_data)
    return experiment_to_dto(experiment)


@router.patch("/{experiment_id}/config", response_model=ExperimentDTO)
async def update_experiment_config(
    experiment_id: str,
    request: UpdateExperimentConfigRequest,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.update_experiment_config(
        experiment_id,
        artifact_type=request.artifact_type,
        image_model=request.image_model,
        video_model=request.video_model,
        images_per_hook=request.images_per_hook,
    )
    return experiment_to_dto(experiment)


@router.post("/{experiment_id}/reference-image")
async def upload_reference_image(
    experiment_id: str,
    file: UploadFile = File(...),
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    image_data = await file.read()
    url = await ops.upload_reference_image(experiment_id, image_data)
    return {"url": url}


@router.post("/{experiment_id}/build", response_model=ExperimentDTO)
async def build_hooks(
    experiment_id: str,
    request: BuildHooksRequest = BuildHooksRequest(),
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    try:
        experiment = await ops.build_hooks(experiment_id, request.count)
        return experiment_to_dto(experiment)
    except asyncio.CancelledError:
        return JSONResponse(status_code=499, content={"message": "Build cancelled"})


@router.delete("/{experiment_id}/build")
async def cancel_build(
    experiment_id: str,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    await ops.cancel_build(experiment_id)
    return {"message": "Build cancelled"}


@router.patch("/{experiment_id}/hooks/{hook_id}", response_model=ExperimentDTO)
async def update_hook_status(
    experiment_id: str,
    hook_id: str,
    request: UpdateHookStatusRequest,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.update_hook_status(
        experiment_id, hook_id, request.status
    )
    return experiment_to_dto(experiment)


@router.post("/{experiment_id}/select-all", response_model=ExperimentDTO)
async def select_all_hooks(
    experiment_id: str,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.select_all_hooks(experiment_id)
    return experiment_to_dto(experiment)


@router.post("/{experiment_id}/deselect-all", response_model=ExperimentDTO)
async def deselect_all_hooks(
    experiment_id: str,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    experiment = await ops.deselect_all_hooks(experiment_id)
    return experiment_to_dto(experiment)


@router.delete("/{experiment_id}")
async def delete_experiment(
    experiment_id: str,
    ops: ExperimentOperations = Depends(get_experiment_operations),
):
    await ops.delete_experiment(experiment_id)
    return {"message": "Experiment deleted"}
