import asyncio
import io
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from PIL import Image

from ..core.config import Settings
from ..domain.ports import AIGenerationPort

logger = logging.getLogger(__name__)


_FIELD_TYPE_MAP = {
    "string": types.Type.STRING,
    "number": types.Type.NUMBER,
    "integer": types.Type.INTEGER,
    "boolean": types.Type.BOOLEAN,
    "array": types.Type.ARRAY,
}


class GeminiClient(AIGenerationPort):
    """Google Gen AI SDK implementation of AIGenerationPort."""

    def __init__(self, settings: Settings):
        self._api_key = settings.GEMINI_API_KEY
        self._client = genai.Client(api_key=self._api_key)
        self._text_model = settings.TEXT_MODEL
        self._vision_model = settings.VISION_MODEL
        self._image_model = settings.IMAGE_MODEL
        self._video_model = settings.VIDEO_MODEL
        self._tts_model = settings.TTS_MODEL
        self._music_model = settings.MUSIC_MODEL

    async def generate_image(self, prompt: str, params: Dict[str, Any]) -> bytes:
        """Generate an image and return raw PNG bytes."""
        config = types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio=params.get("aspect_ratio", "1:1"),
        )
        response = self._client.models.generate_images(
            model=self._image_model, prompt=prompt, config=config,
        )
        # Get first generated image as PIL, convert to bytes
        img = response.generated_images[0].image
        buf = io.BytesIO()
        img._pil_image.save(buf, format="PNG")
        return buf.getvalue()

    @staticmethod
    def _build_output_schema(output_fields: List[Dict]) -> types.Schema:
        """Build a types.Schema from user-defined output fields."""
        properties: Dict[str, types.Schema] = {}
        required: List[str] = []
        for field_def in output_fields:
            name = field_def["name"]
            sdk_type = _FIELD_TYPE_MAP.get(field_def.get("type", "string"), types.Type.STRING)
            kwargs: Dict[str, Any] = {"type": sdk_type}
            if sdk_type == types.Type.ARRAY:
                kwargs["items"] = types.Schema(type=types.Type.STRING)
            properties[name] = types.Schema(**kwargs)
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
        config_kwargs: Dict[str, Any] = {
            "temperature": float(params.get("temperature", 0.7)),
            "max_output_tokens": int(params.get("max_tokens", 2048)),
            "top_p": float(params.get("top_p", 0.95)),
        }
        output_fields = params.get("output_fields")
        if params.get("output_mode") == "structured" and output_fields:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = self._build_output_schema(output_fields)

        config = types.GenerateContentConfig(**config_kwargs)
        contents: List[Any] = []
        for img in (images or []):
            contents.append(types.Part.from_bytes(data=img, mime_type="image/png"))
        for aud in (audios or []):
            contents.append(types.Part.from_bytes(data=aud, mime_type="audio/wav"))
        for vid in (videos or []):
            contents.append(types.Part.from_bytes(data=vid, mime_type="video/mp4"))
        contents.append(prompt)
        response = self._client.models.generate_content(
            model=self._text_model, contents=contents, config=config,
        )
        return response.text

    async def analyze_image(self, image_data: bytes, prompt: str, params: Dict[str, Any]) -> str:
        """Describe or analyze an image using Gemini vision."""
        image = Image.open(io.BytesIO(image_data))
        config = types.GenerateContentConfig(
            temperature=float(params.get("temperature", 0.4)),
            max_output_tokens=int(params.get("max_tokens", 1024)),
        )
        response = self._client.models.generate_content(
            model=self._vision_model, contents=[image, prompt], config=config,
        )
        return response.text

    async def generate_video(
        self,
        prompt: str,
        params: Dict[str, Any],
        image_data: Optional[bytes] = None,
    ) -> bytes:
        """Generate a video clip using Veo 3.1 (async polling). Supports image-to-video."""
        config = types.GenerateVideosConfig(
            person_generation="allow_adult",
            aspect_ratio=params.get("aspect_ratio", "16:9"),
        )
        kwargs: Dict[str, Any] = dict(
            model=self._video_model, prompt=prompt, config=config,
        )
        if image_data:
            kwargs["image"] = types.Image(image_bytes=image_data, mime_type="image/png")
        operation = self._client.models.generate_videos(**kwargs)
        # Veo can take 1-3 minutes — poll every 5 seconds
        while not operation.done:
            await asyncio.sleep(5)
            operation = self._client.operations.get(operation)
        video = operation.result.generated_videos[0]
        self._client.files.download(file=video.video)
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
        response = self._client.models.generate_content(
            model=self._tts_model, contents=text, config=config,
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
