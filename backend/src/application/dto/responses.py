from pydantic import BaseModel
from typing import Dict, List, Optional


class PortDTO(BaseModel):
    id: str
    name: str
    port_type: str
    direction: str
    required: bool
    description: str


class MediaUrlsDTO(BaseModel):
    original: str
    thumbnail: str


class MediaMetadataDTO(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    format: Optional[str] = None
    size_bytes: Optional[int] = None


class MediaResultDTO(BaseModel):
    id: str
    timestamp: int
    media_type: str
    urls: MediaUrlsDTO
    prompt: str
    metadata: MediaMetadataDTO
    generation_params: Dict
    original_prompt: Optional[str] = None


class NodeDTO(BaseModel):
    id: str
    type: str
    label: str
    params: Dict
    position: Dict[str, float]
    provider: str
    status: str
    input_ports: List[PortDTO]
    output_ports: List[PortDTO]
    result: Optional[MediaResultDTO] = None
    error_message: Optional[str] = None
    stale: bool = False


class EdgeDTO(BaseModel):
    id: str
    from_node_id: str
    from_port_id: str
    to_node_id: str
    to_port_id: str


class GraphDTO(BaseModel):
    id: str
    name: str
    canvas_memory: str = ""
    created_at: float = 0
    updated_at: float = 0
    nodes: List[NodeDTO]
    edges: List[EdgeDTO]


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
