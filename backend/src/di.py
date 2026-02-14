"""Dependency injection — composition root.

This module sits at the top level of the `src` package because it wires
together all layers (core, domain, infrastructure, application).  No other
layer should import from here except `presentation` (routes).
"""

from functools import lru_cache

from .core.config import get_settings
from .domain.ports import AIGenerationPort, CanvasMemoryPort, ExperimentRepositoryPort, GraphRepositoryPort, PromptEnrichmentPort, StoragePort
from .infrastructure.prompt_enrichment import HybridPromptEnricher, NoOpPromptEnricher
from .infrastructure.gemini_client import GeminiClient
from .infrastructure.local_storage import LocalStorageManager
from .infrastructure.json_repository import JsonGraphRepository
from .infrastructure.json_experiment_repository import JsonExperimentRepository
from .infrastructure.static_memory import StaticCanvasMemory
from .domain.services.node_executor import NodeExecutor
from .domain.services.input_resolver import InputResolver
from .domain.services.graph_executor import GraphExecutor
from .domain.services.batch_scheduler import BatchScheduler
from .domain.services.experiment_service import ExperimentService
from .application.use_cases.graph_operations import GraphOperations
from .application.use_cases.node_operations import NodeOperations
from .application.use_cases.edge_operations import EdgeOperations
from .application.use_cases.execution_operations import ExecutionOperations
from .application.use_cases.batch_execution_operations import BatchExecutionOperations
from .application.use_cases.experiment_operations import ExperimentOperations


@lru_cache()
def _ai_client() -> AIGenerationPort:
    return GeminiClient(get_settings())


@lru_cache()
def _storage() -> StoragePort:
    return LocalStorageManager(get_settings())


@lru_cache()
def _repo() -> GraphRepositoryPort:
    return JsonGraphRepository(get_settings())


@lru_cache()
def _canvas_memory() -> CanvasMemoryPort:
    return StaticCanvasMemory()


@lru_cache()
def _enricher() -> PromptEnrichmentPort:
    if get_settings().ENRICHMENT_ENABLED:
        return HybridPromptEnricher(_ai_client())
    return NoOpPromptEnricher()


@lru_cache()
def _node_executor() -> NodeExecutor:
    return NodeExecutor(_ai_client(), _storage(), _enricher())


@lru_cache()
def _input_resolver() -> InputResolver:
    return InputResolver(_storage())


@lru_cache()
def _graph_executor() -> GraphExecutor:
    return GraphExecutor(_node_executor(), _storage(), _input_resolver())


def get_graph_operations() -> GraphOperations:
    return GraphOperations(_repo(), _storage())


def get_node_operations() -> NodeOperations:
    return NodeOperations(_repo(), _storage())


def get_edge_operations() -> EdgeOperations:
    return EdgeOperations(_repo())


@lru_cache()
def get_execution_operations() -> ExecutionOperations:
    return ExecutionOperations(_graph_executor(), _repo(), _canvas_memory())


@lru_cache()
def _batch_scheduler() -> BatchScheduler:
    return BatchScheduler(_node_executor(), _input_resolver())


@lru_cache()
def get_batch_execution_operations() -> BatchExecutionOperations:
    return BatchExecutionOperations(_batch_scheduler(), _repo(), _canvas_memory())


@lru_cache()
def _experiment_repo() -> ExperimentRepositoryPort:
    return JsonExperimentRepository(get_settings())


@lru_cache()
def _experiment_service() -> ExperimentService:
    return ExperimentService(_ai_client())


@lru_cache()
def get_experiment_operations() -> ExperimentOperations:
    return ExperimentOperations(
        _experiment_repo(), _repo(), _storage(), _experiment_service(),
    )
