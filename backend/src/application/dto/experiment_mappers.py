"""Centralized experiment domain-model → DTO mapping functions."""

from ...domain.models.experiment import ContentGenome, Experiment, GenomeDimension, Hook, RequiredAsset
from .experiment_responses import (
    ContentGenomeDTO,
    ExperimentDTO,
    GenomeDimensionDTO,
    HookDTO,
    RequiredAssetDTO,
)


def genome_dimension_to_dto(d: GenomeDimension) -> GenomeDimensionDTO:
    return GenomeDimensionDTO(
        name=d.name,
        values=d.values,
        description=d.description,
    )


def required_asset_to_dto(a: RequiredAsset) -> RequiredAssetDTO:
    return RequiredAssetDTO(name=a.name, description=a.description)


def genome_to_dto(g: ContentGenome) -> ContentGenomeDTO:
    return ContentGenomeDTO(
        dimensions=[genome_dimension_to_dto(d) for d in g.dimensions],
        brief=g.brief,
        goal=g.goal,
        target_audience=g.target_audience,
        platform=g.platform,
        desired_outcome=g.desired_outcome,
        reference_image_url=g.reference_image_url,
        reference_image_usage=g.reference_image_usage,
        required_assets=[required_asset_to_dto(a) for a in g.required_assets],
    )


def hook_to_dto(h: Hook) -> HookDTO:
    return HookDTO(
        id=h.id,
        graph_id=h.graph_id,
        genome_label=h.genome_label,
        status=h.status.value,
        label=h.label,
    )


def experiment_to_dto(e: Experiment) -> ExperimentDTO:
    return ExperimentDTO(
        id=e.id,
        name=e.name,
        brief=e.brief,
        status=e.status.value,
        genome=genome_to_dto(e.genome) if e.genome else None,
        hooks=[hook_to_dto(h) for h in e.hooks],
        created_at=e.created_at,
        updated_at=e.updated_at,
        artifact_type=e.artifact_type,
        image_model=e.image_model,
        video_model=e.video_model,
        images_per_hook=e.images_per_hook,
    )
