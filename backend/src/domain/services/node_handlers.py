"""Strategy handlers for each node type — one class per generation kind.

Adding a new node type (e.g. Publish, Translate) means adding one handler here
and registering it in NodeExecutor. No other files need to change (Open/Closed).
"""

import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List

from ..models.enums import ImageModel
from ..models.graph import Node
from ..models.media import MediaMetadata, MediaResult, MediaType, MediaUrls
from ..ports import AIGenerationPort, PromptEnrichmentPort, StoragePort

_MULTIMODAL_IMAGE_MODELS = {ImageModel.FLASH_IMAGE.value, ImageModel.PRO_IMAGE.value}
from ...core.utils.id_generator import generate_id
from ...core.utils.audio_utils import pcm_to_wav


class NodeHandler(ABC):
    """Base class for all node-type handlers."""

    def __init__(self, ai: AIGenerationPort, storage: StoragePort, enricher: PromptEnrichmentPort):
        self._ai = ai
        self._storage = storage
        self._enricher = enricher

    @abstractmethod
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult: ...

    async def _maybe_enrich(self, prompt: str, node: Node) -> tuple[str, str | None]:
        """Returns (final_prompt, original_prompt_if_enriched).

        Enrichment is applied when:
        - enrich=True (default for canvas nodes), OR
        - human_edited=True (human overrode an experiment node's prompt)
        """
        enrich_flag = node.params.get("enrich", True)
        human_edited = node.params.get("human_edited", False)
        if not enrich_flag and not human_edited:
            return prompt, None
        enriched = await self._enricher.enrich(prompt, node.type)
        if enriched == prompt:
            return prompt, None
        return enriched, prompt

    @staticmethod
    def _join_texts(input_data: Dict[str, Any], node_prompt: str, canvas_memory: str = "") -> str:
        """Combine canvas memory, upstream text(s), and the node's own prompt.

        Priority: upstream text is primary (e.g. from a prompt-writer node),
        node_prompt is secondary direction, canvas_memory is background context.
        """
        upstream = "\n".join(t for t in input_data.get("texts", []) if t)
        parts: list[str] = []
        if canvas_memory:
            parts.append(f"Context:\n{canvas_memory}")
        if upstream and node_prompt:
            parts.append(f"{upstream}\n\nAdditional direction: {node_prompt}")
        elif upstream:
            parts.append(upstream)
        elif node_prompt:
            parts.append(node_prompt)
        return "\n\n".join(parts)

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
        prompt, original = await self._maybe_enrich(prompt, node)
        text = await self._ai.generate_text(
            prompt, node.params,
            images=input_data.get("images", []),
            audios=input_data.get("audios", []),
            videos=input_data.get("videos", []),
        )
        urls = await self._storage.upload_text(node.id, text)
        result = self._build_result(node, prompt, MediaType.TEXT, urls)
        result.original_prompt = original
        return result


class ImageHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        prompt, original = await self._maybe_enrich(prompt, node)
        upstream_images = input_data.get("images") or None
        image_bytes = await self._ai.generate_image(
            prompt, node.params, images=upstream_images,
        )
        urls = await self._storage.upload_image(node.id, image_bytes)
        result = self._build_result(node, prompt, MediaType.IMAGE, urls)
        result.original_prompt = original
        return result


class VideoHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        prompt, original = await self._maybe_enrich(prompt, node)
        images = input_data.get("images", [])

        if node.params.get("reference_mode") and images:
            video_bytes = await self._ai.generate_video(
                prompt, node.params,
                reference_images=images[:3],
            )
        else:
            video_bytes = await self._ai.generate_video(
                prompt, node.params,
                image_data=images[0] if images else None,
            )

        urls = await self._storage.upload_video(node.id, video_bytes)
        result = self._build_result(node, prompt, MediaType.VIDEO, urls)
        result.original_prompt = original
        return result


class SpeechHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        text = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        text, original = await self._maybe_enrich(text, node)
        pcm_data = await self._ai.generate_speech(text, node.params)
        wav_bytes = pcm_to_wav(pcm_data, sample_rate=24000, channels=1)
        urls = await self._storage.upload_audio(node.id, wav_bytes)
        result = self._build_result(node, text, MediaType.AUDIO, urls)
        result.original_prompt = original
        return result


class MusicHandler(NodeHandler):
    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str) -> MediaResult:
        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        prompt, original = await self._maybe_enrich(prompt, node)
        pcm_data = await self._ai.generate_music(prompt, node.params)
        wav_bytes = pcm_to_wav(pcm_data, sample_rate=48000, channels=2)
        urls = await self._storage.upload_audio(node.id, wav_bytes)
        result = self._build_result(node, prompt, MediaType.AUDIO, urls)
        result.original_prompt = original
        return result


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

        prompt = self._join_texts(input_data, node.params.get("prompt", ""), canvas_memory)
        prompt, original = await self._maybe_enrich(prompt, node)

        model = node.params.get("model", "")
        if model in _MULTIMODAL_IMAGE_MODELS:
            # Flash/Pro can see the image directly — single API call
            new_bytes = await self._ai.generate_image(prompt, node.params, images=images)
        else:
            # Imagen fallback — describe first, then generate from text
            description = await self._ai.analyze_image(
                images[0], "Describe this image concisely.", node.params
            )
            prompt = f"{description}. {prompt}" if prompt else description
            new_bytes = await self._ai.generate_image(prompt, node.params)

        urls = await self._storage.upload_image(node.id, new_bytes)
        result = self._build_result(node, prompt, MediaType.IMAGE, urls)
        result.original_prompt = original
        return result
