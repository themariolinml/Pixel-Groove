from ..domain.models.graph import Graph
from ..domain.ports import CanvasMemoryPort


class StaticCanvasMemory(CanvasMemoryPort):
    """Returns the graph's canvas_memory string as-is. Default implementation."""

    async def resolve(self, graph: Graph) -> str:
        return graph.canvas_memory or ""
