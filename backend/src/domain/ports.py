"""Domain port interfaces (ABCs) — the contracts that infrastructure must implement."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from .models.graph import Graph
from .models.media import MediaUrls


class AIGenerationPort(ABC):
    """Contract for AI content generation (Gemini, OpenAI, Replicate, etc.)."""

    @abstractmethod
    async def generate_text(
            self,
            prompt: str,
            params: Dict[str, Any],
            *,
            images: Optional[List[bytes]] = None,
            audios: Optional[List[bytes]] = None,
            videos: Optional[List[bytes]] = None,
    ) -> str: ...

    @abstractmethod
    async def generate_image(self, prompt: str, params: Dict[str, Any]) -> bytes: ...

    @abstractmethod
    async def generate_video(
            self, prompt: str, params: Dict[str, Any], *, image_data: Optional[bytes] = None
    ) -> bytes: ...

    @abstractmethod
    async def generate_speech(self, text: str, params: Dict[str, Any]) -> bytes: ...

    @abstractmethod
    async def generate_music(self, prompt: str, params: Dict[str, Any]) -> bytes: ...

    @abstractmethod
    async def analyze_image(
            self, image_data: bytes, prompt: str, params: Dict[str, Any]
    ) -> str: ...


class StoragePort(ABC):
    """Contract for media storage (local filesystem, S3, GCS, etc.)."""

    @abstractmethod
    async def upload_image(
            self, node_id: str, image_data: bytes, fmt: str = "png"
    ) -> MediaUrls: ...

    @abstractmethod
    async def upload_text(self, node_id: str, text: str) -> MediaUrls: ...

    @abstractmethod
    async def upload_video(
            self, node_id: str, video_bytes: bytes, fmt: str = "mp4"
    ) -> MediaUrls: ...

    @abstractmethod
    async def upload_audio(
            self, node_id: str, audio_bytes: bytes, fmt: str = "wav"
    ) -> MediaUrls: ...

    @abstractmethod
    async def read_media_bytes(self, url: str) -> Optional[bytes]: ...

    @abstractmethod
    async def delete_node_media(self, node_id: str) -> None: ...

    @abstractmethod
    async def duplicate_node_media(
            self, source_node_id: str, target_node_id: str
    ) -> None: ...


class GraphRepositoryPort(ABC):
    """Contract for graph persistence (JSON files, PostgreSQL, etc.)."""

    @abstractmethod
    async def save(self, graph: Graph) -> None: ...

    @abstractmethod
    async def load(self, graph_id: str) -> Optional[Graph]: ...

    @abstractmethod
    async def delete(self, graph_id: str) -> None: ...

    @abstractmethod
    async def list_all(self) -> List[Graph]: ...


class CanvasMemoryPort(ABC):
    """Contract for resolving canvas memory (static string, RAG, templates, etc.)."""

    @abstractmethod
    async def resolve(self, graph: Graph) -> str: ...
