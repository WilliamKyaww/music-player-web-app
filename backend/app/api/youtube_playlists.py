from fastapi import APIRouter, HTTPException, status

from app.models.exports import PlaylistExportJob
from app.models.youtube_playlists import CreateYouTubePlaylistExportRequest
from app.services.exports import ExportError, get_export_manager
from app.services.youtube_playlists import extract_youtube_playlist

router = APIRouter()


@router.post(
    "/youtube-playlists/export",
    response_model=PlaylistExportJob,
    status_code=status.HTTP_202_ACCEPTED,
)
async def export_youtube_playlist(
    request: CreateYouTubePlaylistExportRequest,
) -> PlaylistExportJob:
    export_manager = get_export_manager()

    try:
        playlist = extract_youtube_playlist(str(request.playlist_url))
        return export_manager.create_external_export(
            playlist_id=f"youtube_playlist:{playlist.playlist_id}",
            playlist_name=playlist.title,
            items=playlist.items,
            delete_previous_exports_for_playlist=request.delete_previous_exports_for_playlist,
            export_format=request.export_format,
        )
    except ExportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
