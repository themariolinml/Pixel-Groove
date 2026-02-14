"""Shared helper functions for use case operations."""

from ...core.exceptions import GraphNotFoundError
from ...domain.models.graph import Graph
from ...domain.ports import GraphRepositoryPort


async def get_graph_or_raise(repo: GraphRepositoryPort, graph_id: str) -> Graph:
    """Load a graph by ID or raise GraphNotFoundError if not found.

    This helper eliminates duplication across multiple operation classes.
    """
    graph = await repo.load(graph_id)
    if not graph:
        raise GraphNotFoundError(graph_id)
    return graph
