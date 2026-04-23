from typing import Literal

from pydantic import BaseModel

ExportStatus = Literal["queued", "preparing", "packaging", "completed", "failed"]


class PlaylistExportJob(BaseModel):
    id: str
    playlist_id: str
    playlist_name: str
    status: ExportStatus
    status_detail: str | None = None
    progress_percent: int
    created_at: str
    updated_at: str
    item_count: int
    completed_item_count: int
    file_name: str | None = None
    file_size_bytes: int | None = None
    download_path: str | None = None
    error_message: str | None = None


class PlaylistExportListResponse(BaseModel):
    items: list[PlaylistExportJob]
