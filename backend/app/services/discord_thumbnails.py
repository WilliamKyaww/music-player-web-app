from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re
from threading import RLock

import httpx
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings

VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{6,32}$")
THUMBNAIL_SIZE = (512, 512)
MIN_SOURCE_EDGE = 240


class DiscordThumbnailError(RuntimeError):
    pass


class DiscordThumbnailManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._lock = RLock()

    def get_thumbnail_path(self, video_id: str) -> Path:
        normalized_video_id = video_id.strip()
        if not VIDEO_ID_PATTERN.match(normalized_video_id):
            raise DiscordThumbnailError("Invalid YouTube video id.")

        cache_dir = self.settings.discord_thumbnails_dir
        cache_path = cache_dir / f"{normalized_video_id}.jpg"
        if cache_path.exists():
            return cache_path

        with self._lock:
            if cache_path.exists():
                return cache_path

            cache_dir.mkdir(parents=True, exist_ok=True)
            image = self._fetch_best_thumbnail(normalized_video_id)
            if image is None:
                raise DiscordThumbnailError("Could not fetch a Discord thumbnail.")

            square_image = ImageOps.fit(
                image.convert("RGB"),
                THUMBNAIL_SIZE,
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            square_image.save(cache_path, format="JPEG", quality=90, optimize=True)
            return cache_path

    def _fetch_best_thumbnail(self, video_id: str) -> Image.Image | None:
        for url in self._candidate_urls(video_id):
            try:
                with httpx.Client(timeout=httpx.Timeout(10.0), follow_redirects=True) as client:
                    response = client.get(url)
                    response.raise_for_status()
            except httpx.HTTPError:
                continue

            content_type = response.headers.get("content-type", "").split(";", 1)[0]
            if not content_type.startswith("image/"):
                continue

            try:
                image = Image.open(BytesIO(response.content))
                image.load()
            except (OSError, UnidentifiedImageError):
                continue

            if min(image.size) < MIN_SOURCE_EDGE:
                continue

            return image

        return None

    @staticmethod
    def _candidate_urls(video_id: str) -> tuple[str, ...]:
        base_url = f"https://i.ytimg.com/vi/{video_id}"
        return (
            f"{base_url}/maxresdefault.jpg",
            f"{base_url}/hq720.jpg",
            f"{base_url}/sddefault.jpg",
            f"{base_url}/hqdefault.jpg",
        )


_discord_thumbnail_manager = DiscordThumbnailManager()


def get_discord_thumbnail_manager() -> DiscordThumbnailManager:
    return _discord_thumbnail_manager
