from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
import mimetypes

from app.models.downloads import (
    DownloadJob,
    DownloadListResponse,
    DownloadRequest,
    EnqueueDownloadResponse,
    RemoveDownloadResponse,
    UpdateDownloadRequest,
)
from app.services.downloads import (
    DownloadRuntimeError,
    get_download_manager,
)

router = APIRouter()


@router.get("/downloads", response_model=DownloadListResponse)
async def list_downloads() -> DownloadListResponse:
    manager = get_download_manager()
    return DownloadListResponse(runtime=manager.get_runtime_status(), items=manager.list_jobs())


@router.post(
    "/downloads",
    response_model=EnqueueDownloadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_download(request: DownloadRequest) -> EnqueueDownloadResponse:
    manager = get_download_manager()

    try:
        job, deduplicated = manager.enqueue_download(request)
    except DownloadRuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return EnqueueDownloadResponse(job=job, deduplicated=deduplicated)


@router.patch("/downloads/{job_id}", response_model=DownloadJob)
async def update_download(job_id: str, request: UpdateDownloadRequest) -> DownloadJob:
    manager = get_download_manager()

    try:
        return manager.update_job(job_id, request)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download not found.") from exc
    except DownloadRuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/downloads/{job_id}", response_model=RemoveDownloadResponse)
async def remove_download(job_id: str, delete_file: bool = True) -> RemoveDownloadResponse:
    manager = get_download_manager()

    try:
        removed_job_id, deleted_file = manager.remove_job(job_id, delete_file=delete_file)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download not found.") from exc
    except DownloadRuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return RemoveDownloadResponse(
        removed_job_id=removed_job_id,
        deleted_file=deleted_file,
    )


@router.get("/downloads/{job_id}", response_model=DownloadJob)
async def get_download(job_id: str) -> DownloadJob:
    manager = get_download_manager()

    try:
        return manager.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download not found.") from exc


@router.get("/downloads/{job_id}/file")
async def get_download_file(job_id: str) -> FileResponse:
    manager = get_download_manager()

    try:
        file_path = manager.get_file_path(job_id)
        job = manager.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download not found.") from exc
    except DownloadRuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The completed MP3 file could not be found on disk.",
        )

    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=job.file_name or file_path.name,
    )


@router.get("/downloads/{job_id}/thumbnail")
async def get_download_thumbnail(job_id: str) -> FileResponse:
    manager = get_download_manager()

    try:
        file_path = manager.get_thumbnail_path(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download not found.") from exc
    except DownloadRuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    media_type = mimetypes.guess_type(file_path.name)[0] or "image/jpeg"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_path.name,
    )
