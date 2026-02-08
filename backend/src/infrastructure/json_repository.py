import json
import logging
import time
from pathlib import Path
from typing import List, Optional

from ..core.config import Settings
from ..domain.models.graph import Graph
from ..domain.ports import GraphRepositoryPort

logger = logging.getLogger(__name__)


class JsonGraphRepository(GraphRepositoryPort):
    """JSON file implementation of GraphRepositoryPort."""

    def __init__(self, settings: Settings):
        self._dir = Path(settings.STORAGE_PATH) / "graphs"
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, graph_id: str) -> Path:
        return self._dir / f"{graph_id}.json"

    async def save(self, graph: Graph) -> None:
        graph.updated_at = time.time()
        data = graph.to_dict()
        self._path(graph.id).write_text(json.dumps(data, indent=2), encoding="utf-8")

    async def load(self, graph_id: str) -> Optional[Graph]:
        path = self._path(graph_id)
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return Graph.from_dict(data)

    async def delete(self, graph_id: str) -> None:
        path = self._path(graph_id)
        if path.exists():
            path.unlink()

    async def list_all(self) -> List[Graph]:
        graphs = []
        for path in sorted(self._dir.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            graphs.append(Graph.from_dict(data))
        return graphs
