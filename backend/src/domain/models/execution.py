from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class ExecutionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ExecutionEvent:
    """A single event emitted during graph execution (sent to frontend via SSE)."""
    execution_id: str
    event_type: str  # "started", "node_started", "node_completed", "media_ready", "completed", "failed"
    timestamp: int
    node_id: Optional[str] = None
    data: Optional[Dict] = None


@dataclass
class ExecutionContext:
    """Tracks the state of a running graph execution."""
    execution_id: str
    graph_id: str
    output_node_ids: List[str]
    force: bool = False
    status: ExecutionStatus = ExecutionStatus.PENDING
    events: List[ExecutionEvent] = field(default_factory=list)
    cancelled: bool = False
