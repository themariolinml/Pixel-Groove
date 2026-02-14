import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum

from .enums import ArtifactType, ImageModel, VideoModel


class ExperimentStatus(Enum):
    BRIEF = "brief"
    GENOME = "genome"
    BUILT = "built"
    REVIEWED = "reviewed"
    EXECUTED = "executed"


class HookStatus(Enum):
    DRAFT = "draft"
    SELECTED = "selected"
    EXECUTED = "executed"
    REJECTED = "rejected"


@dataclass
class GenomeDimension:
    name: str
    values: List[str]
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "values": self.values,
            "description": self.description,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "GenomeDimension":
        return cls(
            name=d["name"],
            values=d["values"],
            description=d.get("description", ""),
        )


@dataclass
class RequiredAsset:
    name: str
    description: str = ""

    def to_dict(self) -> dict:
        return {"name": self.name, "description": self.description}

    @classmethod
    def from_dict(cls, d: dict) -> "RequiredAsset":
        return cls(name=d["name"], description=d.get("description", ""))


@dataclass
class ContentGenome:
    dimensions: List[GenomeDimension]
    brief: str
    goal: str = ""
    target_audience: str = ""
    platform: str = ""
    desired_outcome: str = ""
    reference_image_url: str = ""
    reference_image_usage: str = ""  # "style" | "composition" | "mood" | "recreate"
    required_assets: List[RequiredAsset] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "dimensions": [dim.to_dict() for dim in self.dimensions],
            "brief": self.brief,
            "goal": self.goal,
            "target_audience": self.target_audience,
            "platform": self.platform,
            "desired_outcome": self.desired_outcome,
            "reference_image_url": self.reference_image_url,
            "reference_image_usage": self.reference_image_usage,
            "required_assets": [a.to_dict() for a in self.required_assets],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ContentGenome":
        return cls(
            dimensions=[GenomeDimension.from_dict(dim) for dim in d["dimensions"]],
            brief=d["brief"],
            goal=d.get("goal", ""),
            target_audience=d.get("target_audience", ""),
            platform=d.get("platform", ""),
            desired_outcome=d.get("desired_outcome", ""),
            reference_image_url=d.get("reference_image_url", ""),
            reference_image_usage=d.get("reference_image_usage", ""),
            required_assets=[RequiredAsset.from_dict(a) for a in d.get("required_assets", [])],
        )


@dataclass
class Hook:
    id: str
    graph_id: str
    genome_label: Dict[str, str]
    status: HookStatus = HookStatus.DRAFT
    label: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "graph_id": self.graph_id,
            "genome_label": self.genome_label,
            "status": self.status.value,
            "label": self.label,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Hook":
        return cls(
            id=d["id"],
            graph_id=d["graph_id"],
            genome_label=d["genome_label"],
            status=HookStatus(d.get("status", "draft")),
            label=d.get("label", ""),
        )


@dataclass
class Experiment:
    id: str
    name: str
    brief: str
    status: ExperimentStatus = ExperimentStatus.BRIEF
    genome: Optional[ContentGenome] = None
    hooks: List[Hook] = field(default_factory=list)
    artifact_type: str = ArtifactType.VIDEO.value
    image_model: str = ImageModel.IMAGEN_ULTRA.value
    video_model: str = VideoModel.VEO.value
    images_per_hook: int | None = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "brief": self.brief,
            "status": self.status.value,
            "genome": self.genome.to_dict() if self.genome else None,
            "hooks": [h.to_dict() for h in self.hooks],
            "artifact_type": self.artifact_type,
            "image_model": self.image_model,
            "video_model": self.video_model,
            "images_per_hook": self.images_per_hook,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Experiment":
        genome = ContentGenome.from_dict(d["genome"]) if d.get("genome") else None
        hooks = [Hook.from_dict(h) for h in d.get("hooks", [])]
        now = time.time()
        return cls(
            id=d["id"],
            name=d["name"],
            brief=d["brief"],
            status=ExperimentStatus(d.get("status", "brief")),
            genome=genome,
            hooks=hooks,
            artifact_type=d.get("artifact_type", ArtifactType.VIDEO.value),
            image_model=d.get("image_model", ImageModel.IMAGEN_ULTRA.value),
            video_model=d.get("video_model", VideoModel.VEO.value),
            images_per_hook=d.get("images_per_hook"),
            created_at=d.get("created_at", now),
            updated_at=d.get("updated_at", now),
        )
