import asyncio
import logging
from typing import List

from ...core.exceptions import ExperimentNotFoundError
from ...core.utils.id_generator import generate_id
from ...domain.models.experiment import (
    ContentGenome,
    Experiment,
    ExperimentStatus,
    GenomeDimension,
    Hook,
    HookStatus,
    RequiredAsset,
)
from ...domain.ports import ExperimentRepositoryPort, GraphRepositoryPort, StoragePort
from ...domain.services.experiment_service import ExperimentService

logger = logging.getLogger(__name__)


class ExperimentOperations:
    def __init__(
        self,
        experiment_repo: ExperimentRepositoryPort,
        graph_repo: GraphRepositoryPort,
        storage: StoragePort,
        experiment_service: ExperimentService,
    ):
        self._experiment_repo = experiment_repo
        self._graph_repo = graph_repo
        self._storage = storage
        self._experiment_service = experiment_service
        self._build_tasks: dict[str, asyncio.Task] = {}

    async def create_experiment(self, name: str, brief: str) -> Experiment:
        experiment = Experiment(
            id=generate_id(),
            name=name,
            brief=brief,
            status=ExperimentStatus.BRIEF,
        )
        await self._experiment_repo.save(experiment)
        return experiment

    async def get_experiment(self, experiment_id: str) -> Experiment:
        experiment = await self._experiment_repo.load(experiment_id)
        if not experiment:
            raise ExperimentNotFoundError(experiment_id)
        return experiment

    async def list_experiments(self) -> List[Experiment]:
        return await self._experiment_repo.list_all()

    async def generate_genome(self, experiment_id: str, brief: str | None = None) -> Experiment:
        experiment = await self.get_experiment(experiment_id)
        if brief is not None:
            experiment.brief = brief
        genome = await self._experiment_service.generate_genome(experiment.brief, experiment.artifact_type)
        experiment.genome = genome
        experiment.status = ExperimentStatus.GENOME
        await self._experiment_repo.save(experiment)
        return experiment

    async def update_genome(self, experiment_id: str, genome_data: dict) -> Experiment:
        experiment = await self.get_experiment(experiment_id)

        dimensions = [
            GenomeDimension(
                name=d["name"],
                values=d["values"],
                description=d.get("description", ""),
            )
            for d in genome_data.get("dimensions", [])
        ]

        required_assets = [
            RequiredAsset(name=a["name"], description=a.get("description", ""))
            for a in genome_data.get("required_assets", [])
        ]

        genome = ContentGenome(
            dimensions=dimensions,
            brief=genome_data.get("brief", experiment.brief),
            goal=genome_data.get("goal", ""),
            target_audience=genome_data.get("target_audience", ""),
            platform=genome_data.get("platform", ""),
            desired_outcome=genome_data.get("desired_outcome", ""),
            reference_image_url=genome_data.get("reference_image_url", ""),
            reference_image_usage=genome_data.get("reference_image_usage", ""),
            required_assets=required_assets,
        )

        experiment.genome = genome
        experiment.status = ExperimentStatus.GENOME
        await self._experiment_repo.save(experiment)
        return experiment

    async def update_experiment_config(
        self, experiment_id: str,
        artifact_type: str | None = None,
        image_model: str | None = None,
        video_model: str | None = None,
        images_per_hook: int = -1,
    ) -> Experiment:
        experiment = await self.get_experiment(experiment_id)
        if artifact_type is not None:
            experiment.artifact_type = artifact_type
        if image_model is not None:
            experiment.image_model = image_model
        if video_model is not None:
            experiment.video_model = video_model
        if images_per_hook != -1:
            experiment.images_per_hook = images_per_hook if images_per_hook > 0 else None
        await self._experiment_repo.save(experiment)
        return experiment

    async def build_hooks(self, experiment_id: str, count: int = 4) -> Experiment:
        self._build_tasks[experiment_id] = asyncio.current_task()
        try:
            experiment = await self.get_experiment(experiment_id)

            if not experiment.genome:
                raise ValueError("Experiment must have a genome before building hooks")

            reference_image_bytes = None
            if experiment.genome.reference_image_url:
                reference_image_bytes = await self._storage.read_media_bytes(
                    experiment.genome.reference_image_url
                )

            logger.info("Generating %d %s hook graphs for experiment %s", count, experiment.artifact_type, experiment_id)
            results = await self._experiment_service.generate_hook_graphs(
                genome=experiment.genome,
                experiment_name=experiment.name,
                count=count,
                artifact_type=experiment.artifact_type,
                image_model=experiment.image_model,
                video_model=experiment.video_model,
                reference_image_bytes=reference_image_bytes,
                images_per_hook=experiment.images_per_hook,
            )
            logger.info("Got %d hook graphs", len(results))

            hooks = []
            for graph, genome_label in results:
                graph.experiment_id = experiment.id
                await self._graph_repo.save(graph)

                hook = Hook(
                    id=generate_id(),
                    graph_id=graph.id,
                    genome_label=genome_label,
                    status=HookStatus.DRAFT,
                    label=graph.name,
                )
                hooks.append(hook)

            experiment.hooks = hooks
            experiment.status = ExperimentStatus.BUILT
            await self._experiment_repo.save(experiment)
            return experiment
        except asyncio.CancelledError:
            self._build_tasks.pop(experiment_id, None)
            raise
        finally:
            self._build_tasks.pop(experiment_id, None)

    async def update_hook_status(
        self,
        experiment_id: str,
        hook_id: str,
        status: str,
    ) -> Experiment:
        experiment = await self.get_experiment(experiment_id)

        hook = next((h for h in experiment.hooks if h.id == hook_id), None)
        if not hook:
            raise ValueError(f"Hook {hook_id} not found")

        hook.status = HookStatus(status)
        await self._experiment_repo.save(experiment)
        return experiment

    async def select_all_hooks(self, experiment_id: str) -> Experiment:
        experiment = await self.get_experiment(experiment_id)

        for hook in experiment.hooks:
            if hook.status in (HookStatus.DRAFT, HookStatus.EXECUTED):
                hook.status = HookStatus.SELECTED

        await self._experiment_repo.save(experiment)
        return experiment

    async def deselect_all_hooks(self, experiment_id: str) -> Experiment:
        experiment = await self.get_experiment(experiment_id)

        for hook in experiment.hooks:
            if hook.status in (HookStatus.SELECTED, HookStatus.EXECUTED):
                hook.status = HookStatus.DRAFT

        await self._experiment_repo.save(experiment)
        return experiment

    async def delete_experiment(self, experiment_id: str) -> None:
        experiment = await self.get_experiment(experiment_id)

        for hook in experiment.hooks:
            graph = await self._graph_repo.load(hook.graph_id)
            if graph:
                for node_id in graph.nodes:
                    await self._storage.delete_node_media(node_id)
                await self._graph_repo.delete(hook.graph_id)

        await self._experiment_repo.delete(experiment_id)

    async def upload_reference_image(self, experiment_id: str, image_data: bytes) -> str:
        await self.get_experiment(experiment_id)
        urls = await self._storage.upload_image(f"experiments/{experiment_id}", image_data)
        return urls.original

    async def cancel_build(self, experiment_id: str) -> None:
        task = self._build_tasks.get(experiment_id)
        if task:
            task.cancel()
