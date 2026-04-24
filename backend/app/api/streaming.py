from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse

from app.services.streaming import StreamingError, get_audio_stream_url
from app.services.downloads import get_download_manager

router = APIRouter()


@router.get("/stream/{video_id}")
async def stream_audio(video_id: str) -> RedirectResponse:
    """Redirect to a direct audio stream URL for the given YouTube video.

    If the video has already been downloaded, serves the local MP3 file instead.
    Otherwise, extracts a direct audio URL via yt-dlp and redirects to it.
    """
    # First check if we already have a completed download for this video
    manager = get_download_manager()
    existing = manager.find_completed_job_for_video(video_id)
    if existing and existing.download_path:
        return RedirectResponse(
            url=existing.download_path,
            status_code=status.HTTP_302_FOUND,
        )

    # Extract a direct audio URL
    try:
        audio_url, _title = get_audio_stream_url(video_id)
    except StreamingError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return RedirectResponse(
        url=audio_url,
        status_code=status.HTTP_302_FOUND,
    )
