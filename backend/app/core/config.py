from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "SpotiMy API"
    frontend_origin: str = Field(
        default="http://localhost:5173",
        alias="FRONTEND_ORIGIN",
    )
    youtube_api_key: str = Field(default="", alias="YOUTUBE_API_KEY")
    youtube_api_base_url: str = "https://www.googleapis.com/youtube/v3"
    youtube_default_max_results: int = 12
    request_timeout_seconds: float = 15.0
    youtube_search_cache_ttl_seconds: int = Field(
        default=300,
        alias="YOUTUBE_SEARCH_CACHE_TTL_SECONDS",
    )
    ffmpeg_binary: str = Field(default="ffmpeg", alias="FFMPEG_BINARY")
    downloads_dir: Path = Field(
        default=BACKEND_DIR / "data" / "downloads",
        alias="DOWNLOADS_DIR",
    )
    playlists_dir: Path = Field(
        default=BACKEND_DIR / "data" / "playlists",
        alias="PLAYLISTS_DIR",
    )
    max_concurrent_downloads: int = Field(default=2, alias="MAX_CONCURRENT_DOWNLOADS")

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
