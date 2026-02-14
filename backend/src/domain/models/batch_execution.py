"""Domain models for batch (multi-graph) execution."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set

from .graph import Graph, Node, NodeType


class BatchStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class GraphOutcome(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class NodeTypeConfig:
    """Per-type concurrency and priority settings."""
    max_concurrency: int
    priority: int = 0  # Higher value = scheduled first when multiple nodes are ready


DEFAULT_TYPE_CONFIGS: Dict[NodeType, NodeTypeConfig] = {
    NodeType.GENERATE_TEXT:      NodeTypeConfig(max_concurrency=10, priority=5),
    NodeType.ANALYZE_IMAGE:      NodeTypeConfig(max_concurrency=8,  priority=6),
    NodeType.GENERATE_IMAGE:     NodeTypeConfig(max_concurrency=4,  priority=3),
    NodeType.TRANSFORM_IMAGE:    NodeTypeConfig(max_concurrency=4,  priority=3),
    NodeType.GENERATE_SPEECH:    NodeTypeConfig(max_concurrency=4,  priority=4),
    NodeType.GENERATE_MUSIC:     NodeTypeConfig(max_concurrency=3,  priority=2),
    NodeType.GENERATE_VIDEO:     NodeTypeConfig(max_concurrency=2,  priority=1),
}


@dataclass
class SchedulableNode:
    """A work unit in the global scheduler.

    Wraps a Node with cross-graph dependency and context information.
    """
    node_id: str
    graph_id: str
    node_type: NodeType
    dependencies: Set[str]
    node: Node
    graph: Graph
    canvas_memory: str = ""


@dataclass
class BatchContext:
    """Tracks the overall state of a batch execution."""
    batch_id: str
    experiment_id: str
    graph_ids: List[str]
    force: bool = False
    cancelled: bool = False
    status: BatchStatus = BatchStatus.PENDING
    graph_outcomes: Dict[str, GraphOutcome] = field(default_factory=dict)


@dataclass
class BatchEvent:
    """An event emitted during batch execution (sent to frontend via SSE)."""
    batch_id: str
    event_type: str
    timestamp: int
    graph_id: Optional[str] = None
    node_id: Optional[str] = None
    data: Optional[Dict] = None
