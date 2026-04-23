import asyncio
import json
import shutil
import threading
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.models.downloads import DownloadRequest
from app.models.exports import PlaylistExportJob
from app.models.playlists import Playlist
from app.services.downloads import DownloadManager, DownloadRuntimeError, get_download_manager
from app.services.playlists import PlaylistError, get_playlist_manager

EXPORTS_REGISTRY_FILENAME = "exports.json"
ACTIVE_EXPORT_STATUSES = {"queued", "preparing", "packaging"}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_filename(value: str) -> str:
    cleaned = "".join(char for char in value if char not in '<>:"/\\|?*').strip()
    cleaned = " ".join(cleaned.split())
    return cleaned[:120] or "playlist-export"


class ExportError(RuntimeError):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(slots=True)
class _ExportRecord:
    id: str
    playlist_id: str
    playlist_name: str
    status: str
    status_detail: str | None
    progress_percent: int
    created_at: str
    updated_at: str
    item_count: int
    completed_item_count: int
    file_name: str | None = None
    file_size_bytes: int | None = None
    file_path: Path | None = None
    error_message: str | None = None

    def to_public_model(self) -> PlaylistExportJob:
        download_path = None
        if self.status == "completed" and self.file_path:
            download_path = f"/api/exports/{self.id}/file"

        return PlaylistExportJob(
            id=self.id,
            playlist_id=self.playlist_id,
            playlist_name=self.playlist_name,
            status=self.status,  # type: ignore[arg-type]
            status_detail=self.status_detail,
            progress_percent=self.progress_percent,
            created_at=self.created_at,
            updated_at=self.updated_at,
            item_count=self.item_count,
            completed_item_count=self.completed_item_count,
            file_name=self.file_name,
            file_size_bytes=self.file_size_bytes,
            download_path=download_path,
            error_message=self.error_message,
        )


class PlaylistExportManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.settings.exports_dir.mkdir(parents=True, exist_ok=True)
        self._registry_path = self.settings.exports_dir / EXPORTS_REGISTRY_FILENAME
        self._exports: dict[str, _ExportRecord] = {}
        self._lock = threading.RLock()
        self._restore_from_disk()

    def list_exports(self) -> list[PlaylistExportJob]:
        with self._lock:
            ordered = sorted(
                self._exports.values(),
                key=lambda item: item.created_at,
                reverse=True,
            )
            return [item.to_public_model() for item in ordered]

    def get_export(self, export_id: str) -> PlaylistExportJob:
        with self._lock:
            export = self._exports.get(export_id)
            if export is None:
                raise KeyError(export_id)
            return export.to_public_model()

    def get_file_path(self, export_id: str) -> Path:
        with self._lock:
            export = self._exports.get(export_id)
            if export is None:
                raise KeyError(export_id)
            if export.status != "completed" or export.file_path is None:
                raise ExportError("This export is not ready yet.", status_code=409)
            return export.file_path

    def create_export(self, playlist_id: str, *, delete_previous_exports_for_playlist: bool) -> PlaylistExportJob:
        playlist_manager = get_playlist_manager()
        playlists = {playlist.id: playlist for playlist in playlist_manager.list_playlists()}
        playlist = playlists.get(playlist_id)
        if playlist is None:
            raise ExportError("Playlist not found.", status_code=404)
        if not playlist.items:
            raise ExportError("Add at least one song before exporting the playlist.", status_code=409)

        with self._lock:
            if delete_previous_exports_for_playlist:
                self._remove_exports_for_playlist_unlocked(playlist_id)

            export_id = uuid4().hex
            timestamp = _utc_now()
            record = _ExportRecord(
                id=export_id,
                playlist_id=playlist.id,
                playlist_name=playlist.name,
                status="queued",
                status_detail="Waiting for export worker slot.",
                progress_percent=0,
                created_at=timestamp,
                updated_at=timestamp,
                item_count=len(playlist.items),
                completed_item_count=0,
            )
            self._exports[export_id] = record
            self._persist_unlocked()

        asyncio.create_task(self._run_export(export_id, playlist))
        return record.to_public_model()

    async def _run_export(self, export_id: str, playlist: Playlist) -> None:
        await asyncio.to_thread(self._run_export_sync, export_id, playlist)

    def _run_export_sync(self, export_id: str, playlist: Playlist) -> None:
        download_manager = get_download_manager()
        export_dir = self.settings.exports_dir / export_id
        export_dir.mkdir(parents=True, exist_ok=True)

        try:
            self._update_export(
                export_id,
                status="preparing",
                progress_percent=5,
                status_detail="Preparing playlist export...",
            )

            collected_files: list[Path] = []
            for index, item in enumerate(playlist.items, start=1):
                download = download_manager.ensure_download_sync(
                    DownloadRequest(
                        video_id=item.video_id,
                        title=item.title,
                        channel_title=item.channel_title,
                        thumbnail_url=item.thumbnail_url,
                        source_url=item.source_url,
                    )
                )
                file_path = download_manager.get_file_path(download.id)
                collected_files.append(file_path)
                progress = int(5 + (index / max(1, len(playlist.items))) * 70)
                self._update_export(
                    export_id,
                    status="preparing",
                    progress_percent=min(progress, 75),
                    status_detail=f"Prepared {index} of {len(playlist.items)} track(s).",
                    completed_item_count=index,
                )

            zip_path = export_dir / f"{_sanitize_filename(playlist.name)}.zip"
            self._update_export(
                export_id,
                status="packaging",
                progress_percent=82,
                status_detail="Building ZIP archive...",
            )

            with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                seen_names: dict[str, int] = {}
                for index, file_path in enumerate(collected_files, start=1):
                    file_name = file_path.name
                    counter = seen_names.get(file_name, 0)
                    seen_names[file_name] = counter + 1
                    arcname = file_name if counter == 0 else f"{file_path.stem} ({counter + 1}){file_path.suffix}"
                    archive.write(file_path, arcname=arcname)
                    progress = int(82 + (index / max(1, len(collected_files))) * 16)
                    self._update_export(
                        export_id,
                        status="packaging",
                        progress_percent=min(progress, 98),
                        status_detail=f"Archived {index} of {len(collected_files)} track(s).",
                    )

            self._update_export(
                export_id,
                status="completed",
                progress_percent=100,
                status_detail="ZIP export is ready to save.",
                file_name=zip_path.name,
                file_size_bytes=zip_path.stat().st_size,
                file_path=zip_path,
                error_message=None,
            )
        except (DownloadRuntimeError, PlaylistError, ExportError) as exc:
            self._mark_failed(export_id, str(exc))
        except Exception as exc:  # pragma: no cover - depends on local fs/network
            self._mark_failed(export_id, str(exc))

    def remove_export(self, export_id: str, *, delete_file: bool = True) -> tuple[str, bool]:
        with self._lock:
            export = self._exports.get(export_id)
            if export is None:
                raise KeyError(export_id)
            if export.status in ACTIVE_EXPORT_STATUSES:
                raise ExportError("Active exports cannot be removed yet.", status_code=409)

            deleted_file = False
            export_dir = self.settings.exports_dir / export.id
            if export_dir.exists() and (delete_file or export.file_path is None):
                deleted_file = delete_file and export.file_path is not None and export.file_path.exists()
                shutil.rmtree(export_dir, ignore_errors=True)

            self._exports.pop(export_id, None)
            self._persist_unlocked()
            return export_id, deleted_file

    def _remove_exports_for_playlist_unlocked(self, playlist_id: str) -> None:
        to_remove = [export_id for export_id, export in self._exports.items() if export.playlist_id == playlist_id and export.status not in ACTIVE_EXPORT_STATUSES]
        for export_id in to_remove:
            export_dir = self.settings.exports_dir / export_id
            if export_dir.exists():
                shutil.rmtree(export_dir, ignore_errors=True)
            self._exports.pop(export_id, None)

    def _mark_failed(self, export_id: str, message: str) -> None:
        self._update_export(
            export_id,
            status="failed",
            progress_percent=0,
            status_detail="Playlist export failed.",
            error_message=message,
        )

    def _update_export(self, export_id: str, **changes: object) -> None:
        with self._lock:
            export = self._exports.get(export_id)
            if export is None:
                return
            for field_name, value in changes.items():
                setattr(export, field_name, value)
            export.updated_at = _utc_now()
            self._persist_unlocked()

    def _restore_from_disk(self) -> None:
        if not self._registry_path.exists():
            return
        try:
            payload = json.loads(self._registry_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        if not isinstance(payload, list):
            return

        for item in payload:
            if not isinstance(item, dict):
                continue
            try:
                export = self._deserialize_export(item)
            except (KeyError, TypeError, ValueError):
                continue

            if export.status in ACTIVE_EXPORT_STATUSES:
                export.status = "failed"
                export.status_detail = "Export interrupted by backend restart."
                export.error_message = "The backend restarted before this export finished."
                export.progress_percent = 0
                export.file_name = None
                export.file_size_bytes = None
                export.file_path = None
                export.updated_at = _utc_now()

            if export.status == "completed" and export.file_path and not export.file_path.exists():
                export.status = "failed"
                export.status_detail = "Recorded ZIP file is missing."
                export.error_message = "The saved ZIP file could not be found on disk."
                export.file_name = None
                export.file_size_bytes = None
                export.file_path = None
                export.progress_percent = 0
                export.updated_at = _utc_now()

            self._exports[export.id] = export

        with self._lock:
            self._persist_unlocked()

    def _persist_unlocked(self) -> None:
        payload = [self._serialize_export(export) for export in self._exports.values()]
        self._registry_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    @staticmethod
    def _serialize_export(export: _ExportRecord) -> dict[str, object]:
        return {
            "id": export.id,
            "playlist_id": export.playlist_id,
            "playlist_name": export.playlist_name,
            "status": export.status,
            "status_detail": export.status_detail,
            "progress_percent": export.progress_percent,
            "created_at": export.created_at,
            "updated_at": export.updated_at,
            "item_count": export.item_count,
            "completed_item_count": export.completed_item_count,
            "file_name": export.file_name,
            "file_size_bytes": export.file_size_bytes,
            "file_path": str(export.file_path) if export.file_path else None,
            "error_message": export.error_message,
        }

    @staticmethod
    def _deserialize_export(payload: dict[str, object]) -> _ExportRecord:
        file_path = payload.get("file_path")
        return _ExportRecord(
            id=str(payload["id"]),
            playlist_id=str(payload["playlist_id"]),
            playlist_name=str(payload["playlist_name"]),
            status=str(payload["status"]),
            status_detail=str(payload["status_detail"]) if payload.get("status_detail") else None,
            progress_percent=int(payload.get("progress_percent", 0)),
            created_at=str(payload["created_at"]),
            updated_at=str(payload["updated_at"]),
            item_count=int(payload.get("item_count", 0)),
            completed_item_count=int(payload.get("completed_item_count", 0)),
            file_name=str(payload["file_name"]) if payload.get("file_name") else None,
            file_size_bytes=int(payload["file_size_bytes"]) if payload.get("file_size_bytes") is not None else None,
            file_path=Path(str(file_path)) if file_path else None,
            error_message=str(payload["error_message"]) if payload.get("error_message") else None,
        )


_export_manager: PlaylistExportManager | None = None


def get_export_manager() -> PlaylistExportManager:
    global _export_manager
    if _export_manager is None:
        _export_manager = PlaylistExportManager()
    return _export_manager
