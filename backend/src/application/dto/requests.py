from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class PositionDTO(BaseModel):
    x: float
    y: float


class CreateGraphRequest(BaseModel):
    name: str


class UpdateGraphRequest(BaseModel):
    name: Optional[str] = None
    canvas_memory: Optional[str] = None


class CreateNodeRequest(BaseModel):
    type: str  # "text_to_image", "text_to_text", etc.
    label: str
    params: Dict = Field(default_factory=dict)
    position: PositionDTO
    provider: str = "gemini"


class UpdateNodeRequest(BaseModel):
    params: Optional[Dict] = None
    position: Optional[PositionDTO] = None
    label: Optional[str] = None


class CreateEdgeRequest(BaseModel):
    from_node_id: str
    from_port_id: str
    to_node_id: str
    to_port_id: str


class ExecuteGraphRequest(BaseModel):
    graph_id: str
    output_node_ids: List[str]
    force: bool = False


class BatchExecuteRequest(BaseModel):
    experiment_id: str
    graph_ids: List[str]
    force: bool = False
