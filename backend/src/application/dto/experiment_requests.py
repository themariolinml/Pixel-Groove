from pydantic import BaseModel
from typing import Dict, List, Optional


class CreateExperimentRequest(BaseModel):
    name: str
    brief: str


class UpdateGenomeRequest(BaseModel):
    dimensions: List[Dict]
    brief: str
    goal: Optional[str] = None
    target_audience: Optional[str] = None
    platform: Optional[str] = None
    desired_outcome: Optional[str] = None
    reference_image_url: Optional[str] = None
    reference_image_usage: Optional[str] = None
    required_assets: Optional[List[Dict]] = None


class GenerateGenomeRequest(BaseModel):
    brief: Optional[str] = None


class UpdateExperimentConfigRequest(BaseModel):
    artifact_type: str | None = None
    image_model: str | None = None
    video_model: str | None = None
    images_per_hook: int = -1


class BuildHooksRequest(BaseModel):
    count: int = 4


class UpdateHookStatusRequest(BaseModel):
    status: str
