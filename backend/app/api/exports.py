from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.models.downloads import RemoveDownloadResponse
from app.models.exports import PlaylistExportJob, PlaylistExportListResponse
from app.services.exports import ExportError, get_export_manager

router = APIRouter()


@router.get("/exports", response_model=PlaylistExportListResponse)
async def list_exports() -> PlaylistExportListResponse:
    manager = get_export_manager()
    return PlaylistExportListResponse(items=manager.list_exports())


@router.get("/exports/{export_id}", response_model=PlaylistExportJob)
async def get_export(export_id: str) -> PlaylistExportJob:
    manager = get_export_manager()
    try:
        return manager.get_export(export_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found.") from exc


@router.get("/exports/{export_id}/file")
async def get_export_file(export_id: str) -> FileResponse:
    manager = get_export_manager()
    try:
        export = manager.get_export(export_id)
        file_path = manager.get_file_path(export_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found.") from exc
    except ExportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export ZIP not found on disk.")

    return FileResponse(
        path=file_path,
        media_type="audio/mpeg" if file_path.suffix.lower() == ".mp3" else "application/zip",
        filename=export.file_name or file_path.name,
    )


@router.delete("/exports/{export_id}", response_model=RemoveDownloadResponse)
async def remove_export(export_id: str, delete_file: bool = True) -> RemoveDownloadResponse:
    manager = get_export_manager()
    try:
        removed_job_id, deleted_file = manager.remove_export(export_id, delete_file=delete_file)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found.") from exc
    except ExportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return RemoveDownloadResponse(removed_job_id=removed_job_id, deleted_file=deleted_file)
