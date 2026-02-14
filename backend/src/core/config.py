from functools import lru_cache

from pydantic_settings import BaseSettings

from ..domain.models.enums import AudioModel, ImageModel, TextModel, VideoModel


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""

    STORAGE_PATH: str = "./storage"
    BASE_URL: str = "http://localhost:8000"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    LOG_LEVEL: str = "INFO"

    # AI model names (override via .env)
    TEXT_MODEL: str = TextModel.FLASH.value
    VISION_MODEL: str = TextModel.FLASH.value
    IMAGE_MODEL: str = ImageModel.IMAGEN.value
    IMAGE_MODEL_FAST: str = ImageModel.IMAGEN_FAST.value
    IMAGE_MODEL_ULTRA: str = ImageModel.IMAGEN_ULTRA.value
    FLASH_IMAGE_MODEL: str = ImageModel.FLASH_IMAGE.value
    PRO_IMAGE_MODEL: str = ImageModel.PRO_IMAGE.value
    VIDEO_MODEL: str = VideoModel.VEO.value
    TTS_MODEL: str = AudioModel.TTS.value
    MUSIC_MODEL: str = AudioModel.MUSIC.value

    ENRICHMENT_ENABLED: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
