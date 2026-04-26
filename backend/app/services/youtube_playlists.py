from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

from app.models.playlists import PlaylistItem
from app.services.downloads import yt_dlp
from app.services.exports import ExportError


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(slots=True)
class YouTubePlaylistInfo:
    playlist_id: str
    title: str
    items: list[PlaylistItem]


def extract_youtube_playlist(playlist_url: str) -> YouTubePlaylistInfo:
    if yt_dlp is None:
        raise ExportError("yt-dlp is not installed.", status_code=503)

    parsed = urlparse(playlist_url)
    query = parse_qs(parsed.query)
    list_id = query.get("list", [None])[0]
    normalized_url = (
        f"https://www.youtube.com/playlist?list={list_id}"
        if isinstance(list_id, str) and list_id
        else playlist_url
    )

    from app.core.config import get_settings
    settings = get_settings()

    options = {
        "extract_flat": True,
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }

    if settings.youtube_cookies_file:
        options["cookiefile"] = settings.youtube_cookies_file

    if settings.po_token_server_url:
        options["extractor_args"] = {
            "youtubepot-bgutilhttp": {
                "base_url": [settings.po_token_server_url],
            },
        }

    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(normalized_url, download=False)

    if not isinstance(info, dict):
        raise ExportError("Could not read the YouTube playlist metadata.", status_code=502)

    entries = info.get("entries", [])
    if not isinstance(entries, list) or not entries:
        raise ExportError("That YouTube playlist has no readable entries.", status_code=409)

    playlist_id = str(info.get("id") or "youtube-playlist")
    playlist_title = str(info.get("title") or "YouTube playlist")
    items: list[PlaylistItem] = []

    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue

        video_id = entry.get("id")
        if not isinstance(video_id, str):
            continue

        url = entry.get("url")
        source_url = (
            str(url)
            if isinstance(url, str) and url.startswith("http")
            else f"https://www.youtube.com/watch?v={video_id}"
        )

        thumbnails = entry.get("thumbnails", [])
        thumbnail_url = None
        if isinstance(thumbnails, list) and thumbnails:
            last = thumbnails[-1]
            if isinstance(last, dict) and last.get("url"):
                thumbnail_url = str(last["url"])

        items.append(
            PlaylistItem(
                id=f"{playlist_id}-{video_id}",
                video_id=video_id,
                title=str(entry.get("title") or f"Track {index + 1}"),
                channel_title=str(entry.get("channel") or entry.get("uploader") or ""),
                thumbnail_url=thumbnail_url,
                source_url=source_url,
                duration_label=None,
                added_at=_utc_now(),
                position=index,
            )
        )

    if not items:
        raise ExportError("No valid video entries were found in that YouTube playlist.", status_code=409)

    return YouTubePlaylistInfo(
        playlist_id=playlist_id,
        title=playlist_title,
        items=items,
    )
