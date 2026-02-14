import asyncio
import io
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from PIL import Image

from ..core.config import Settings
from ..domain.models.enums import ImageModel
from ..domain.ports import AIGenerationPort

# Models that support the image_size parameter
_IMAGE_SIZE_MODELS = {ImageModel.IMAGEN.value, ImageModel.IMAGEN_ULTRA.value}

logger = logging.getLogger(__name__)


_FIELD_TYPE_MAP = {
    "string": types.Type.STRING,
    "number": types.Type.NUMBER,
    "integer": types.Type.INTEGER,
    "boolean": types.Type.BOOLEAN,
    "array": types.Type.ARRAY,
    "object": types.Type.OBJECT,
}


class GeminiClient(AIGenerationPort):
    """Google Gen AI SDK implementation of AIGenerationPort."""

    def __init__(self, settings: Settings):
        self._api_key = settings.GEMINI_API_KEY
        self._client = genai.Client(api_key=self._api_key)
        self._text_model = settings.TEXT_MODEL
        self._vision_model = settings.VISION_MODEL
        self._video_model = settings.VIDEO_MODEL
        self._tts_model = settings.TTS_MODEL

        self._imagen_fast = settings.IMAGE_MODEL_FAST
        self._imagen = settings.IMAGE_MODEL
        self._imagen_ultra = settings.IMAGE_MODEL_ULTRA
        self._flash_image = settings.FLASH_IMAGE_MODEL
        self._pro_image = settings.PRO_IMAGE_MODEL
        self._music_model = settings.MUSIC_MODEL
        self._output_token_limits: dict[str, int] = {}

    async def _get_output_token_limit(self, model: str) -> int:
        """Get the model's output_token_limit, querying the API on first use."""
        if model not in self._output_token_limits:
            try:
                info = await asyncio.to_thread(self._client.models.get, model=model)
                limit = info.output_token_limit or 8192
                self._output_token_limits[model] = limit
            except Exception:
                logger.warning("Could not fetch output_token_limit for %s, using 8192", model)
                self._output_token_limits[model] = 8192
        return self._output_token_limits[model]

    async def generate_image(
        self, prompt: str, params: Dict[str, Any],
        *, images: Optional[List[bytes]] = None,
    ) -> bytes:

        """Generate an image and return raw bytes.

        The model param should be a real model ID (e.g. "imagen-4.0-generate-001",
        "gemini-2.5-flash-image"). Flash/Pro models use generate_content API with
        multimodal input; Imagen models use generate_images API.
        """
        model_name = params.get("model", self._imagen)

        if model_name in (self._flash_image, self._pro_image):
            # Gemini native image generation — supports multimodal input
            image_config_kwargs: Dict[str, Any] = {}
            if params.get("aspect_ratio"):
                image_config_kwargs["aspect_ratio"] = params["aspect_ratio"]
            # image_size only supported by Pro Image, not Flash
            if model_name == self._pro_image and params.get("image_size"):
                image_config_kwargs["image_size"] = params["image_size"]

            config_kwargs: Dict[str, Any] = {"response_modalities": ["IMAGE"]}
            if image_config_kwargs:
                config_kwargs["image_config"] = types.ImageConfig(**image_config_kwargs)

            # Build multimodal contents: upstream images as context + text prompt
            contents: List[Any] = []
            for img_bytes in (images or []):
                contents.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
            contents.append(prompt)

            logger.info(
                "generate_image model=%s, image_config=%s, num_upstream_images=%d, prompt_len=%d",
                model_name, image_config_kwargs,
                len(images or []), len(prompt),
            )
            try:
                response = await asyncio.to_thread(
                    self._client.models.generate_content,
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
            except Exception as exc:
                logger.error(
                    "generate_image FAILED: %s | model=%s, image_config=%s, "
                    "num_upstream_images=%d, prompt_preview=%.25s",
                    exc, model_name, image_config_kwargs,
                    len(images or []), prompt,
                )
                raise
            if (
                not response.candidates
                or not response.candidates[0].content
                or not response.candidates[0].content.parts
            ):
                raise RuntimeError(
                    f"generate_image ({model_name}): empty response from API "
                    f"(candidates={bool(response.candidates)}, "
                    f"finish_reason={getattr(response.candidates[0], 'finish_reason', 'N/A') if response.candidates else 'no candidates'})"
                )
            return response.candidates[0].content.parts[0].inline_data.data

        # Imagen 4 family (fast / standard / ultra)
        imagen_config: Dict[str, Any] = {
            "number_of_images": 1,
            "aspect_ratio": params.get("aspect_ratio", "1:1"),
            "person_generation": "allow_adult",
        }
        if params.get("image_size") and model_name in _IMAGE_SIZE_MODELS:
            imagen_config["image_size"] = params["image_size"]
        logger.info(
            "generate_image model=%s, config=%s, prompt_len=%d",
            model_name,
            {k: v for k, v in imagen_config.items() if k != "negative_prompt"},
            len(prompt),
        )
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_images,
                model=model_name,
                prompt=prompt,
                config=types.GenerateImagesConfig(**imagen_config),
            )
        except Exception as exc:
            logger.error(
                "generate_image FAILED: %s | model=%s, config=%s, prompt_preview=%.25s",
                exc, model_name, imagen_config, prompt,
            )
            raise
        img = response.generated_images[0].image
        buf = io.BytesIO()
        img._pil_image.save(buf, format="PNG")
        return buf.getvalue()

    @staticmethod
    def _build_field_schema(field_def: Dict) -> types.Schema:
        """Build a Schema for a single field, recursing into nested objects/arrays."""
        field_type = field_def.get("type", "string")
        sdk_type = _FIELD_TYPE_MAP.get(field_type, types.Type.STRING)

        if sdk_type == types.Type.OBJECT:
            return GeminiClient._build_output_schema(field_def.get("fields", []))

        if sdk_type == types.Type.ARRAY:
            items_def = field_def.get("items")
            if isinstance(items_def, dict):
                return types.Schema(
                    type=types.Type.ARRAY,
                    items=GeminiClient._build_field_schema(items_def),
                )
            # Simple array of primitives (default: string)
            item_type = _FIELD_TYPE_MAP.get(items_def or "string", types.Type.STRING)
            return types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=item_type),
            )

        return types.Schema(type=sdk_type)

    @staticmethod
    def _build_output_schema(output_fields: List[Dict]) -> types.Schema:
        """Build a top-level object Schema from a list of field definitions."""
        properties: Dict[str, types.Schema] = {}
        required: List[str] = []
        for field_def in output_fields:
            name = field_def["name"]
            properties[name] = GeminiClient._build_field_schema(field_def)
            required.append(name)
        return types.Schema(type=types.Type.OBJECT, properties=properties, required=required)

    async def generate_text(
        self,
        prompt: str,
        params: Dict[str, Any],
        images: Optional[List[bytes]] = None,
        audios: Optional[List[bytes]] = None,
        videos: Optional[List[bytes]] = None,
    ) -> str:
        """Generate text from a prompt, optionally with multimodal inputs and structured output."""
        model_limit = await self._get_output_token_limit(self._text_model)
        config_kwargs: Dict[str, Any] = {
            "temperature": float(params.get("temperature", 0.7)),
            "max_output_tokens": int(params.get("max_output_tokens", model_limit)),
            "top_p": float(params.get("top_p", 0.95)),
        }
        output_mode = params.get("output_mode")
        output_fields = params.get("output_fields")
        if output_mode == "structured" and output_fields:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = self._build_output_schema(output_fields)
        elif output_mode == "json":
            config_kwargs["response_mime_type"] = "application/json"

        config = types.GenerateContentConfig(**config_kwargs)
        contents: List[Any] = []
        for img in (images or []):
            contents.append(types.Part.from_bytes(data=img, mime_type="image/png"))
        for aud in (audios or []):
            contents.append(types.Part.from_bytes(data=aud, mime_type="audio/wav"))
        for vid in (videos or []):
            contents.append(types.Part.from_bytes(data=vid, mime_type="video/mp4"))
        contents.append(prompt)
        response = await asyncio.to_thread(
            self._client.models.generate_content,
            model=self._text_model,
            contents=contents,
            config=config,
        )
        return response.text

    #TODO: is this function necessary. It seems we can just use generate_text?
    async def analyze_image(self, image_data: bytes, prompt: str, params: Dict[str, Any]) -> str:
        """Describe or analyze an image using Gemini vision."""
        vision_limit = await self._get_output_token_limit(self._vision_model)
        image = Image.open(io.BytesIO(image_data))
        config = types.GenerateContentConfig(
            temperature=float(params.get("temperature", 0.4)),
            max_output_tokens=int(params.get("max_output_tokens", vision_limit)),
        )
        response = await asyncio.to_thread(
            self._client.models.generate_content,
            model=self._vision_model,
            contents=[image, prompt],
            config=config,
        )
        return response.text

    async def generate_video(
        self,
        prompt: str,
        params: Dict[str, Any],
        *,
        image_data: Optional[bytes] = None,
        reference_images: Optional[List[bytes]] = None,
    ) -> bytes:
        """Generate a video clip using Veo 3.1 (async polling).

        Supports three modes:
        - text-to-video (no images)
        - image-to-video (single image_data becomes first frame)
        - reference images (up to 3 images for character/style preservation)
        """
        config_kwargs: Dict[str, Any] = {
            "aspect_ratio": params.get("aspect_ratio", "16:9"),
        }
        kwargs: Dict[str, Any] = dict(
            model=self._video_model, prompt=prompt,
        )

        # Set person_generation based on video mode
        if reference_images:
            config_kwargs["person_generation"] = "allow_adult"
        elif image_data:
            config_kwargs["person_generation"] = "allow_adult"
        else:
            config_kwargs["person_generation"] = "allow_all"

        if reference_images:
            refs = []
            for img_bytes in reference_images[:3]:
                ref = types.VideoGenerationReferenceImage(
                    image=types.Image(image_bytes=img_bytes, mime_type="image/png"),
                    reference_type="asset",
                )
                refs.append(ref)
            config_kwargs["reference_images"] = refs
        elif image_data:
            kwargs["image"] = types.Image(image_bytes=image_data, mime_type="image/png")

        kwargs["config"] = types.GenerateVideosConfig(**config_kwargs)
        operation = await asyncio.to_thread(self._client.models.generate_videos, **kwargs)
        # Veo can take 1-3 minutes — poll every 5 seconds
        while not operation.done:
            await asyncio.sleep(5)
            operation = await asyncio.to_thread(self._client.operations.get, operation)
        video = operation.result.generated_videos[0]
        await asyncio.to_thread(self._client.files.download, file=video.video)
        return video.video.video_bytes

    async def generate_speech(self, text: str, params: Dict[str, Any]) -> bytes:
        """Convert text to speech using Gemini TTS. Returns raw PCM (16-bit, 24kHz)."""
        voice = params.get("voice", "Kore")
        config = types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice
                    )
                )
            ),
        )
        response = await asyncio.to_thread(
            self._client.models.generate_content,
            model=self._tts_model,
            contents=text,
            config=config,
        )
        if (
            not response.candidates
            or not response.candidates[0].content
            or not response.candidates[0].content.parts
        ):
            raise RuntimeError(
                f"generate_speech: empty response from API "
                f"(candidates={bool(response.candidates)})"
            )
        return response.candidates[0].content.parts[0].inline_data.data

    async def generate_music(self, prompt: str, params: Dict[str, Any]) -> bytes:
        """Generate music using Lyria real-time streaming. Returns raw PCM (16-bit, 48kHz stereo)."""
        duration = int(params.get("duration", 10))
        music_client = genai.Client(
            api_key=self._api_key,
            http_options=types.HttpOptions(api_version="v1alpha"),
        )
        chunks: list[bytes] = []
        async with music_client.aio.live.music.connect(
            model=self._music_model
        ) as session:
            await session.set_weighted_prompts([
                types.WeightedPrompt(text=prompt, weight=1.0),
            ])
            await session.play()
            end_time = asyncio.get_event_loop().time() + duration
            async for msg in session.receive():
                if msg.server_content and msg.server_content.audio_chunks:
                    for audio_chunk in msg.server_content.audio_chunks:
                        if audio_chunk.data:
                            chunks.append(audio_chunk.data)
                if asyncio.get_event_loop().time() >= end_time:
                    break
        return b"".join(chunks)
