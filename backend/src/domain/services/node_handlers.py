"""Strategy handlers for each node type — one class per generation kind.

Adding a new node type (e.g. Publish, Translate) means adding one handler here
and registering it in NodeExecutor. No other files need to change (Open/Closed).
"""

import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List

from ..models.graph import Node
from ..models.media import MediaMetadata, MediaResult, MediaType, MediaUrls
from ..ports import AIGenerationPort, StoragePort
from ...core.utils.id_generator import generate_id
from ...core.utils.audio_utils import pcm_to_wav


class NodeHandler(ABC):
    """Base class for all node-type handlers."""

    def __init__(self, ai: AIGenerationPort, storage: StoragePort):
        self._ai = ai
        self._storage = storage

    @abstractmethod
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult: ...

    @staticmethod
    def _join_texts(input_data: Dict[str, Any], node_prompt: str, canvas_memory: str = "") -> str:
        """Combine canvas memory, upstream text(s), and the node's own prompt."""
        parts = [p for p in [
            canvas_memory,
            "\n".join(input_data.get("texts", [])),
            node_prompt,
        ] if p]
        return "\n".join(parts)

    def _build_result(self, node: Node, prompt: str, media_type: MediaType, urls: MediaUrls) -> MediaResult:
        return MediaResult(
            id=generate_id(),
            timestamp=int(time.time()),
            media_type=media_type,
            urls=urls,
            prompt=prompt,
            metadata=MediaMetadata(),
            generation_params=node.params,
        )


class TextHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        text = await self._ai.generate_text(
            prompt, node.params,
            images=input_data.get("images", []),
            audios=input_data.get("audios", []),
            videos=input_data.get("videos", []),
        )
        urls = await self._storage.upload_text(node.id, text)
        return self._build_result(node, prompt, MediaType.TEXT, urls)


class ImageHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        image_bytes = await self._ai.generate_image(prompt, node.params)
        urls = await self._storage.upload_image(node.id, image_bytes)
        return self._build_result(node, prompt, MediaType.IMAGE, urls)


class VideoHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        images = input_data.get("images", [])
        video_bytes = await self._ai.generate_video(
            prompt, node.params,
            image_data=images[0] if images else None,
        )
        urls = await self._storage.upload_video(node.id, video_bytes)
        return self._build_result(node, prompt, MediaType.VIDEO, urls)


class SpeechHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        text = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        pcm_data = await self._ai.generate_speech(text, node.params)
        wav_bytes = pcm_to_wav(pcm_data, sample_rate=24000, channels=1)
        urls = await self._storage.upload_audio(node.id, wav_bytes)
        return self._build_result(node, text, MediaType.AUDIO, urls)


class MusicHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        pcm_data = await self._ai.generate_music(prompt, node.params)
        wav_bytes = pcm_to_wav(pcm_data, sample_rate=48000, channels=2)
        urls = await self._storage.upload_audio(node.id, wav_bytes)
        return self._build_result(node, prompt, MediaType.AUDIO, urls)


class AnalyzeImageHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        images: List[bytes] = input_data.get("images", [])
        if not images:
            raise ValueError("Analyze Image requires an image input")
        base_prompt = node.params.get("prompt", "Describe this image in detail.")
        prompt = f"{canvas_memory}\n{base_prompt}".strip() if canvas_memory else base_prompt
        text = await self._ai.analyze_image(images[0], prompt, node.params)
        urls = await self._storage.upload_text(node.id, text)
        return self._build_result(node, prompt, MediaType.TEXT, urls)


class TransformImageHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        images: List[bytes] = input_data.get("images", [])
        if not images:
            raise ValueError("Transform Image requires an image input")
        description = await self._ai.analyze_image(
            images[0], "Describe this image concisely.", node.params
        )
        prompt = node.params.get("prompt", "")
        full_prompt = f"{description}. {prompt}" if prompt else description
        if canvas_memory:
            full_prompt = f"{canvas_memory}\n{full_prompt}"
        new_bytes = await self._ai.generate_image(full_prompt, node.params)
        urls = await self._storage.upload_image(node.id, new_bytes)
        return self._build_result(node, full_prompt, MediaType.IMAGE, urls)
