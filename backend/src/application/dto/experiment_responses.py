from pydantic import BaseModel
from typing import Dict, List, Optional


class GenomeDimensionDTO(BaseModel):
    name: str
    values: List[str]
    description: str = ""


class RequiredAssetDTO(BaseModel):
    name: str
    description: str = ""


class ContentGenomeDTO(BaseModel):
    dimensions: List[GenomeDimensionDTO]
    brief: str
    goal: str = ""
    target_audience: str = ""
    platform: str = ""
    desired_outcome: str = ""
    reference_image_url: str = ""
    reference_image_usage: str = ""
    required_assets: List[RequiredAssetDTO] = []


class HookDTO(BaseModel):
    id: str
    graph_id: str
    genome_label: Dict[str, str]
    status: str
    label: str = ""


class ExperimentDTO(BaseModel):
    id: str
    name: str
    brief: str
    status: str
    genome: Optional[ContentGenomeDTO] = None
    hooks: List[HookDTO] = []
    created_at: float = 0
    updated_at: float = 0
    artifact_type: str = "video"
    image_model: str = "imagen-4.0-ultra-generate-001"
    video_model: str = "veo-3.1-generate-preview"
    images_per_hook: int | None = None
