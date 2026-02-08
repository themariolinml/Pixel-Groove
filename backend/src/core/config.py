from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""

    STORAGE_PATH: str = "./storage"
    BASE_URL: str = "http://localhost:8000"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    LOG_LEVEL: str = "INFO"

    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600

    # AI model names (override via .env)
    TEXT_MODEL: str = "gemini-3-flash-preview"
    VISION_MODEL: str = "gemini-3-flash-preview"
    IMAGE_MODEL: str = "imagen-4.0-generate-001"
    VIDEO_MODEL: str = "veo-3.1-generate-preview"
    TTS_MODEL: str = "gemini-2.5-flash-preview-tts"
    MUSIC_MODEL: str = "models/lyria-realtime-exp"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
