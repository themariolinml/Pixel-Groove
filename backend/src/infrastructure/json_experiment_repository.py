import json
import logging
import time
from pathlib import Path
from typing import List, Optional

from ..core.config import Settings
from ..domain.models.experiment import Experiment
from ..domain.ports import ExperimentRepositoryPort

logger = logging.getLogger(__name__)


class JsonExperimentRepository(ExperimentRepositoryPort):
    """JSON file implementation of ExperimentRepositoryPort."""

    def __init__(self, settings: Settings):
        self._dir = Path(settings.STORAGE_PATH) / "experiments"
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, experiment_id: str) -> Path:
        return self._dir / f"{experiment_id}.json"

    async def save(self, experiment: Experiment) -> None:
        experiment.updated_at = time.time()
        data = experiment.to_dict()
        self._path(experiment.id).write_text(json.dumps(data, indent=2), encoding="utf-8")

    async def load(self, experiment_id: str) -> Optional[Experiment]:
        path = self._path(experiment_id)
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return Experiment.from_dict(data)

    async def delete(self, experiment_id: str) -> None:
        path = self._path(experiment_id)
        if path.exists():
            path.unlink()

    async def list_all(self) -> List[Experiment]:
        experiments = []
        for path in sorted(self._dir.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            experiments.append(Experiment.from_dict(data))
        return experiments
