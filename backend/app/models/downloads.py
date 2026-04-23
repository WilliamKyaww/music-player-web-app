from typing import Literal

from pydantic import BaseModel, HttpUrl

DownloadStatus = Literal["queued", "downloading", "converting", "completed", "failed"]


class DownloadRequest(BaseModel):
    video_id: str
    title: str
    channel_title: str = ""
    thumbnail_url: HttpUrl | None = None
    source_url: HttpUrl | None = None


class DownloadRuntimeStatus(BaseModel):
    available: bool
    missing_dependencies: list[str]
    downloads_directory: str


class DownloadJob(BaseModel):
    id: str
    video_id: str
    title: str
    channel_title: str
    thumbnail_url: HttpUrl | None = None
    source_url: HttpUrl
    status: DownloadStatus
    status_detail: str | None = None
    progress_percent: int
    created_at: str
    updated_at: str
    error_message: str | None = None
    file_name: str | None = None
    file_size_bytes: int | None = None
    download_path: str | None = None


class DownloadListResponse(BaseModel):
    runtime: DownloadRuntimeStatus
    items: list[DownloadJob]


class EnqueueDownloadResponse(BaseModel):
    job: DownloadJob
    deduplicated: bool


class RemoveDownloadResponse(BaseModel):
    removed_job_id: str
    deleted_file: bool
