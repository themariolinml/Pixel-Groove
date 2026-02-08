"""Dependency injection — composition root.

This module sits at the top level of the `src` package because it wires
together all layers (core, domain, infrastructure, application).  No other
layer should import from here except `presentation` (routes).
"""

from functools import lru_cache

from .core.config import get_settings
from .domain.ports import AIGenerationPort, CanvasMemoryPort, GraphRepositoryPort, StoragePort
from .infrastructure.gemini_client import GeminiClient
from .infrastructure.local_storage import LocalStorageManager
from .infrastructure.memory_cache import MemoryCache
from .infrastructure.json_repository import JsonGraphRepository
from .infrastructure.static_memory import StaticCanvasMemory
from .domain.services.node_executor import NodeExecutor
from .domain.services.graph_executor import GraphExecutor
from .application.use_cases.graph_operations import GraphOperations
from .application.use_cases.node_operations import NodeOperations
from .application.use_cases.edge_operations import EdgeOperations
from .application.use_cases.execution_operations import ExecutionOperations


@lru_cache()
def _ai_client() -> AIGenerationPort:
    return GeminiClient(get_settings())


@lru_cache()
def _storage() -> StoragePort:
    return LocalStorageManager(get_settings())


@lru_cache()
def _cache() -> MemoryCache:
    return MemoryCache(get_settings().CACHE_TTL)


@lru_cache()
def _repo() -> GraphRepositoryPort:
    return JsonGraphRepository(get_settings())


@lru_cache()
def _canvas_memory() -> CanvasMemoryPort:
    return StaticCanvasMemory()


@lru_cache()
def _node_executor() -> NodeExecutor:
    return NodeExecutor(_ai_client(), _storage())


@lru_cache()
def _graph_executor() -> GraphExecutor:
    return GraphExecutor(_node_executor(), _storage())


def get_graph_operations() -> GraphOperations:
    return GraphOperations(_repo(), _storage())


def get_node_operations() -> NodeOperations:
    return NodeOperations(_repo(), _storage())


def get_edge_operations() -> EdgeOperations:
    return EdgeOperations(_repo())


@lru_cache()
def get_execution_operations() -> ExecutionOperations:
    return ExecutionOperations(_graph_executor(), _repo(), _canvas_memory())
