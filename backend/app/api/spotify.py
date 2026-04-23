from fastapi import APIRouter, HTTPException

from app.models.spotify import SpotifyPlaylistPreview, SpotifyPreviewRequest
from app.services.spotify import (
    SpotifyConfigError,
    SpotifyUpstreamError,
    preview_spotify_playlist,
)

router = APIRouter()


@router.post("/imports/spotify/preview", response_model=SpotifyPlaylistPreview)
async def preview_spotify_import(request: SpotifyPreviewRequest) -> SpotifyPlaylistPreview:
    try:
        return await preview_spotify_playlist(str(request.playlist_url), request.max_tracks)
    except SpotifyConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SpotifyUpstreamError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
