import re
from typing import Any

import httpx

from app.core.config import get_settings
from app.models.youtube import VideoSearchResult

DURATION_PATTERN = re.compile(
    r"^P(?:(?P<days>\d+)D)?(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)?$"
)

THUMBNAIL_PRIORITY = ("maxres", "high", "medium", "default")


class YouTubeConfigError(RuntimeError):
    """Raised when the YouTube API cannot be used because local config is missing."""


class YouTubeUpstreamError(RuntimeError):
    """Raised when YouTube returns an upstream error or malformed payload."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _format_duration(duration_iso: str) -> str:
    match = DURATION_PATTERN.match(duration_iso)
    if not match:
        return "Unknown"

    parts = {name: int(value or "0") for name, value in match.groupdict().items()}
    total_hours = parts["hours"] + parts["days"] * 24
    total_minutes = parts["minutes"]
    total_seconds = parts["seconds"]

    if total_hours > 0:
        return f"{total_hours}:{total_minutes:02d}:{total_seconds:02d}"

    return f"{total_minutes}:{total_seconds:02d}"


def _pick_thumbnail(snippet: dict[str, Any]) -> str:
    thumbnails = snippet.get("thumbnails", {})

    for key in THUMBNAIL_PRIORITY:
        candidate = thumbnails.get(key)
        if isinstance(candidate, dict) and candidate.get("url"):
            return str(candidate["url"])

    raise YouTubeUpstreamError("YouTube response did not include a thumbnail URL.")


def _extract_google_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or "Unknown error from YouTube."

    error = payload.get("error")
    if not isinstance(error, dict):
        return response.text or "Unknown error from YouTube."

    errors = error.get("errors")
    if isinstance(errors, list) and errors:
        first = errors[0]
        if isinstance(first, dict) and first.get("message"):
            return str(first["message"])

    if error.get("message"):
        return str(error["message"])

    return response.text or "Unknown error from YouTube."


async def _fetch_json(
    client: httpx.AsyncClient,
    *,
    url: str,
    params: dict[str, Any],
) -> dict[str, Any]:
    response = await client.get(url, params=params)

    if response.status_code >= 400:
        detail = _extract_google_error(response)
        status_code = 503 if response.status_code in {401, 403, 429} else 502
        raise YouTubeUpstreamError(
            f"YouTube API request failed: {detail}",
            status_code=status_code,
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise YouTubeUpstreamError("YouTube API returned malformed JSON.") from exc

    if not isinstance(payload, dict):
        raise YouTubeUpstreamError("YouTube API returned an unexpected payload.")

    return payload


async def search_youtube_videos(query: str, max_results: int) -> list[VideoSearchResult]:
    settings = get_settings()

    if not settings.youtube_api_key:
        raise YouTubeConfigError(
            "YouTube search is not configured yet. Add `YOUTUBE_API_KEY` to `backend/.env`."
        )

    timeout = httpx.Timeout(settings.request_timeout_seconds)
    normalized_limit = min(max_results, 24)

    async with httpx.AsyncClient(timeout=timeout) as client:
        search_payload = await _fetch_json(
            client,
            url=f"{settings.youtube_api_base_url}/search",
            params={
                "key": settings.youtube_api_key,
                "part": "snippet",
                "type": "video",
                "maxResults": normalized_limit,
                "q": query,
            },
        )

        search_items = search_payload.get("items", [])
        if not isinstance(search_items, list) or not search_items:
            return []

        video_ids: list[str] = []
        snippet_map: dict[str, dict[str, Any]] = {}

        for item in search_items:
            if not isinstance(item, dict):
                continue

            identifier = item.get("id", {})
            snippet = item.get("snippet", {})
            if not isinstance(identifier, dict) or not isinstance(snippet, dict):
                continue

            video_id = identifier.get("videoId")
            if not isinstance(video_id, str):
                continue

            video_ids.append(video_id)
            snippet_map[video_id] = snippet

        if not video_ids:
            return []

        video_payload = await _fetch_json(
            client,
            url=f"{settings.youtube_api_base_url}/videos",
            params={
                "key": settings.youtube_api_key,
                "part": "contentDetails",
                "id": ",".join(video_ids),
            },
        )

        video_items = video_payload.get("items", [])
        if not isinstance(video_items, list):
            raise YouTubeUpstreamError("YouTube video lookup returned an invalid payload.")

        duration_map: dict[str, str] = {}
        for item in video_items:
            if not isinstance(item, dict):
                continue

            video_id = item.get("id")
            content_details = item.get("contentDetails", {})
            if (
                isinstance(video_id, str)
                and isinstance(content_details, dict)
                and isinstance(content_details.get("duration"), str)
            ):
                duration_map[video_id] = content_details["duration"]

        results: list[VideoSearchResult] = []
        for video_id in video_ids:
            snippet = snippet_map[video_id]
            duration_iso = duration_map.get(video_id, "PT0S")

            results.append(
                VideoSearchResult(
                    id=video_id,
                    title=str(snippet.get("title", "Untitled video")),
                    channel_title=str(snippet.get("channelTitle", "Unknown channel")),
                    channel_id=str(snippet.get("channelId", "")),
                    description=str(snippet.get("description", "")),
                    thumbnail_url=_pick_thumbnail(snippet),
                    duration_iso=duration_iso,
                    duration_label=_format_duration(duration_iso),
                    published_at=str(snippet.get("publishedAt", "")),
                    video_url=f"https://www.youtube.com/watch?v={video_id}",
                )
            )

        return results
