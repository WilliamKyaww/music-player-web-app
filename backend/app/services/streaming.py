"""Audio streaming service — extracts direct audio URLs via yt-dlp."""

import html
import threading
import time
from dataclasses import dataclass

from app.core.config import get_settings

try:
    import yt_dlp
except ImportError:
    yt_dlp = None


class StreamingError(RuntimeError):
    """Raised when audio streaming fails."""


@dataclass(slots=True)
class _CachedStreamUrl:
    url: str
    expires_at: float
    title: str
    duration: int | None


_stream_cache: dict[str, _CachedStreamUrl] = {}
_cache_lock = threading.RLock()
CACHE_TTL_SECONDS = 3600  # 1 hour (YouTube URLs typically expire in ~6 hours)


def _decode_text(value: object, fallback: str = "") -> str:
    text = str(value if value is not None else fallback)
    return html.unescape(text)


def get_audio_stream_url(video_id: str) -> tuple[str, str]:
    """Extract a direct audio stream URL for a YouTube video.

    Returns (audio_url, title).
    """
    with _cache_lock:
        cached = _stream_cache.get(video_id)
        if cached and cached.expires_at > time.time():
            return cached.url, cached.title

    if yt_dlp is None:
        raise StreamingError("yt-dlp is not installed. Cannot stream audio.")

    settings = get_settings()
    ffmpeg_binary = settings.ffmpeg_binary.strip() or "ffmpeg"

    ydl_opts = {
        "format": "bestaudio/best",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "ffmpeg_location": ffmpeg_binary,
    }

    if settings.youtube_cookies_file:
        ydl_opts["cookiefile"] = settings.youtube_cookies_file

    if settings.po_token_server_url:
        ydl_opts["extractor_args"] = {
            "youtubepot-bgutilhttp": {
                "base_url": [settings.po_token_server_url],
            },
        }

    source_url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_url, download=False)
    except Exception as exc:
        raise StreamingError(f"Failed to extract audio URL: {exc}") from exc

    if not info:
        raise StreamingError("yt-dlp returned no info for this video.")

    audio_url = info.get("url")
    if not audio_url:
        # Try to find best audio format
        formats = info.get("formats", [])
        audio_formats = [
            f for f in formats
            if f.get("acodec", "none") != "none" and f.get("vcodec", "none") == "none"
        ]
        if audio_formats:
            # Pick highest quality audio-only format
            audio_formats.sort(key=lambda f: f.get("abr", 0) or 0, reverse=True)
            audio_url = audio_formats[0].get("url")

        if not audio_url:
            # Fall back to any format with audio
            for fmt in formats:
                if fmt.get("url") and fmt.get("acodec", "none") != "none":
                    audio_url = fmt["url"]
                    break

    if not audio_url:
        raise StreamingError("Could not find a streamable audio URL for this video.")

    title = _decode_text(info.get("title"), video_id)
    duration = info.get("duration")

    with _cache_lock:
        _stream_cache[video_id] = _CachedStreamUrl(
            url=audio_url,
            expires_at=time.time() + CACHE_TTL_SECONDS,
            title=title,
            duration=duration,
        )

        # Clean expired entries
        now = time.time()
        expired = [k for k, v in _stream_cache.items() if v.expires_at <= now]
        for k in expired:
            _stream_cache.pop(k, None)

    return audio_url, title
