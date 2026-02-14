from dataclasses import dataclass, field
from typing import Dict, Optional
from enum import Enum


class MediaType(Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"


@dataclass
class MediaUrls:
    original: str
    thumbnail: str


@dataclass
class MediaMetadata:
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    format: Optional[str] = None
    size_bytes: Optional[int] = None


@dataclass
class MediaResult:
    id: str
    timestamp: int
    media_type: MediaType
    urls: MediaUrls
    prompt: str
    metadata: MediaMetadata
    generation_params: Dict = field(default_factory=dict)
    original_prompt: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "media_type": self.media_type.value,
            "urls": {"original": self.urls.original, "thumbnail": self.urls.thumbnail},
            "prompt": self.prompt,
            "metadata": {
                "width": self.metadata.width,
                "height": self.metadata.height,
                "duration": self.metadata.duration,
                "format": self.metadata.format,
                "size_bytes": self.metadata.size_bytes,
            },
            "generation_params": self.generation_params,
            "original_prompt": self.original_prompt,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "MediaResult":
        urls = d["urls"]
        meta = d.get("metadata", {})
        return cls(
            id=d["id"],
            timestamp=d["timestamp"],
            media_type=MediaType(d["media_type"]),
            urls=MediaUrls(original=urls["original"], thumbnail=urls.get("thumbnail", urls["original"])),
            prompt=d["prompt"],
            metadata=MediaMetadata(
                width=meta.get("width"),
                height=meta.get("height"),
                duration=meta.get("duration"),
                format=meta.get("format"),
                size_bytes=meta.get("size_bytes"),
            ),
            generation_params=d.get("generation_params", {}),
            original_prompt=d.get("original_prompt"),
        )
