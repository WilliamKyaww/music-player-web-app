import asyncio
import json
import mimetypes
import re
import shutil
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.models.downloads import (
    DownloadJob,
    DownloadRequest,
    DownloadRuntimeStatus,
    UpdateDownloadRequest,
)

import httpx

try:
    import yt_dlp
except ImportError:  # pragma: no cover - depends on local environment
    yt_dlp = None

INVALID_FILENAME_PATTERN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
MULTISPACE_PATTERN = re.compile(r"\s+")
ACTIVE_JOB_STATUSES = {"queued", "downloading", "converting"}
DOWNLOAD_REGISTRY_FILENAME = "jobs.json"


class DownloadRuntimeError(RuntimeError):
    """Raised when the local machine is missing a tool required for downloads."""


@dataclass(slots=True)
class _DownloadRecord:
    id: str
    video_id: str
    title: str
    channel_title: str
    thumbnail_url: str | None
    source_url: str
    status: str
    status_detail: str | None
    progress_percent: int
    created_at: str
    updated_at: str
    error_message: str | None = None
    file_name: str | None = None
    file_size_bytes: int | None = None
    file_path: Path | None = None
    thumbnail_path: Path | None = None

    def to_public_model(self) -> DownloadJob:
        download_path = None
        if self.status == "completed" and self.file_path:
            download_path = f"/api/downloads/{self.id}/file"
        thumbnail_path = None
        if self.thumbnail_path and self.thumbnail_path.exists():
            thumbnail_path = f"/api/downloads/{self.id}/thumbnail"

        return DownloadJob(
            id=self.id,
            video_id=self.video_id,
            title=self.title,
            channel_title=self.channel_title,
            thumbnail_url=self.thumbnail_url,
            source_url=self.source_url,
            status=self.status,  # type: ignore[arg-type]
            status_detail=self.status_detail,
            progress_percent=self.progress_percent,
            created_at=self.created_at,
            updated_at=self.updated_at,
            error_message=self.error_message,
            file_name=self.file_name,
            file_size_bytes=self.file_size_bytes,
            download_path=download_path,
            thumbnail_path=thumbnail_path,
        )


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sanitize_filename(value: str) -> str:
    cleaned = INVALID_FILENAME_PATTERN.sub("", value).strip()
    cleaned = MULTISPACE_PATTERN.sub(" ", cleaned)
    cleaned = cleaned.strip(". ")

    if not cleaned:
        return "download"

    return cleaned[:120]


class DownloadManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.settings.downloads_dir.mkdir(parents=True, exist_ok=True)
        self._registry_path = self.settings.downloads_dir / DOWNLOAD_REGISTRY_FILENAME
        self._jobs: dict[str, _DownloadRecord] = {}
        self._active_jobs_by_video_id: dict[str, str] = {}
        self._lock = threading.RLock()
        self._worker_semaphore = threading.BoundedSemaphore(
            max(1, self.settings.max_concurrent_downloads)
        )
        self._restore_jobs_from_disk()

    def get_runtime_status(self) -> DownloadRuntimeStatus:
        missing: list[str] = []
        ffmpeg_binary = self._resolve_ffmpeg_binary()

        if yt_dlp is None:
            missing.append("Install yt-dlp in backend/.venv with `pip install yt-dlp`.")

        if ffmpeg_binary is None:
            missing.append(
                "Install ffmpeg and add it to your PATH, or set FFMPEG_BINARY in backend/.env."
            )

        return DownloadRuntimeStatus(
            available=not missing,
            missing_dependencies=missing,
            downloads_directory=str(self.settings.downloads_dir),
        )

    def list_jobs(self) -> list[DownloadJob]:
        with self._lock:
            ordered = sorted(
                self._jobs.values(),
                key=lambda item: item.created_at,
                reverse=True,
            )
            return [item.to_public_model() for item in ordered]

    def get_job(self, job_id: str) -> DownloadJob:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)

            return job.to_public_model()

    def update_job(self, job_id: str, request: UpdateDownloadRequest) -> DownloadJob:
        normalized_title = self._normalize_title(request.title)

        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)

            if job.status in ACTIVE_JOB_STATUSES:
                raise DownloadRuntimeError(
                    "Active downloads cannot be renamed yet. Wait for the job to finish."
                )

            if job.status == "completed" and job.file_path and job.file_path.exists():
                target_path = job.file_path.with_name(
                    f"{_sanitize_filename(f'{normalized_title} [{job.video_id}]')}.mp3"
                )
                if target_path != job.file_path:
                    if target_path.exists():
                        raise DownloadRuntimeError(
                            "A file with that saved-song name already exists."
                        )
                    try:
                        job.file_path.rename(target_path)
                    except OSError as exc:
                        raise DownloadRuntimeError(
                            "Could not rename the saved MP3 file on disk."
                        ) from exc

                    job.file_path = target_path
                    job.file_name = target_path.name

            job.title = normalized_title
            job.updated_at = _utc_now()
            self._persist_registry_unlocked()
            return job.to_public_model()

    def get_file_path(self, job_id: str) -> Path:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)

            if job.status != "completed" or job.file_path is None:
                raise DownloadRuntimeError("This download is not ready yet.")

            return job.file_path

    def get_thumbnail_path(self, job_id: str) -> Path:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)

            if job.thumbnail_path is None or not job.thumbnail_path.exists():
                raise DownloadRuntimeError("This download does not have a saved thumbnail.")

            return job.thumbnail_path

    def get_ffmpeg_binary(self) -> str | None:
        return self._resolve_ffmpeg_binary()

    def find_completed_job_for_video(self, video_id: str) -> DownloadJob | None:
        with self._lock:
            candidates = sorted(
                (
                    job
                    for job in self._jobs.values()
                    if job.video_id == video_id and job.status == "completed"
                ),
                key=lambda item: item.updated_at,
                reverse=True,
            )

            for candidate in candidates:
                if candidate.file_path and candidate.file_path.exists():
                    return candidate.to_public_model()

            return None

    def remove_job(self, job_id: str, *, delete_file: bool = True) -> tuple[str, bool]:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)

            if job.status in ACTIVE_JOB_STATUSES:
                raise DownloadRuntimeError(
                    "Active downloads cannot be removed yet. Wait for the job to finish."
                )

            deleted_file = False
            job_dir = self.settings.downloads_dir / job.id
            if job_dir.exists() and (delete_file or job.file_path is None):
                deleted_file = delete_file and job.file_path is not None and job.file_path.exists()
                shutil.rmtree(job_dir, ignore_errors=True)

            self._jobs.pop(job_id, None)
            self._persist_registry_unlocked()

            return job_id, deleted_file

    def ensure_download_sync(self, request: DownloadRequest, *, timeout_seconds: int = 900) -> DownloadJob:
        existing_completed = self.find_completed_job_for_video(request.video_id)
        if existing_completed is not None:
            return existing_completed

        with self._lock:
            existing_job_id = self._active_jobs_by_video_id.get(request.video_id)
            if existing_job_id:
                target_job_id = existing_job_id
            else:
                timestamp = _utc_now()
                job_id = uuid4().hex
                source_url = str(
                    request.source_url or f"https://www.youtube.com/watch?v={request.video_id}"
                )
                record = _DownloadRecord(
                    id=job_id,
                    video_id=request.video_id,
                    title=request.title or request.video_id,
                    channel_title=request.channel_title,
                    thumbnail_url=str(request.thumbnail_url) if request.thumbnail_url else None,
                    source_url=source_url,
                    status="queued",
                    status_detail="Waiting for an available worker slot.",
                    progress_percent=0,
                    created_at=timestamp,
                    updated_at=timestamp,
                )
                self._jobs[job_id] = record
                self._active_jobs_by_video_id[request.video_id] = job_id
                self._persist_registry_unlocked()
                target_job_id = job_id

        if existing_job_id:
            return self._wait_for_completion_sync(target_job_id, timeout_seconds=timeout_seconds)

        self._run_job_sync(target_job_id)
        return self._wait_for_completion_sync(target_job_id, timeout_seconds=timeout_seconds)

    def enqueue_download(self, request: DownloadRequest) -> tuple[DownloadJob, bool]:
        runtime = self.get_runtime_status()
        if not runtime.available:
            raise DownloadRuntimeError(
                "Download prerequisites are missing. "
                + " ".join(runtime.missing_dependencies)
            )

        with self._lock:
            existing_job_id = self._active_jobs_by_video_id.get(request.video_id)
            if existing_job_id:
                return self._jobs[existing_job_id].to_public_model(), True

            timestamp = _utc_now()
            job_id = uuid4().hex
            source_url = str(request.source_url or f"https://www.youtube.com/watch?v={request.video_id}")

            record = _DownloadRecord(
                id=job_id,
                video_id=request.video_id,
                title=request.title or request.video_id,
                channel_title=request.channel_title,
                thumbnail_url=str(request.thumbnail_url) if request.thumbnail_url else None,
                source_url=source_url,
                status="queued",
                status_detail="Waiting for an available worker slot.",
                progress_percent=0,
                created_at=timestamp,
                updated_at=timestamp,
            )
            self._jobs[job_id] = record
            self._active_jobs_by_video_id[request.video_id] = job_id
            self._persist_registry_unlocked()

        asyncio.create_task(self._run_job(job_id))
        return record.to_public_model(), False

    async def _run_job(self, job_id: str) -> None:
        await asyncio.to_thread(self._run_job_sync, job_id)

    def _run_job_sync(self, job_id: str) -> None:
        self._worker_semaphore.acquire()
        try:
            self._download_with_yt_dlp(job_id)
        except Exception as exc:  # pragma: no cover - depends on local tools/network
            self._mark_failed(job_id, str(exc))
        finally:
            self._release_active_job(job_id)
            self._worker_semaphore.release()

    def _download_with_yt_dlp(self, job_id: str) -> None:
        if yt_dlp is None:  # pragma: no cover - defensive guard
            raise DownloadRuntimeError("yt-dlp is not installed.")

        settings = self.settings

        with self._lock:
            job = self._jobs[job_id]
            safe_base_name = _sanitize_filename(f"{job.title} [{job.video_id}]")
            job_dir = settings.downloads_dir / job_id

        job_dir.mkdir(parents=True, exist_ok=True)
        thumbnail_path = self._download_thumbnail(job_id, job_dir)
        output_template = str(job_dir / f"{safe_base_name}.%(ext)s")

        def progress_hook(progress_data: dict) -> None:
            status = progress_data.get("status")

            if status == "downloading":
                total_bytes = progress_data.get("total_bytes") or progress_data.get(
                    "total_bytes_estimate"
                )
                downloaded_bytes = progress_data.get("downloaded_bytes")
                percent = 8

                if isinstance(total_bytes, (int, float)) and total_bytes > 0 and isinstance(
                    downloaded_bytes, (int, float)
                ):
                    ratio = max(0.0, min(1.0, downloaded_bytes / total_bytes))
                    percent = int(8 + ratio * 82)

                detail = progress_data.get("_percent_str")
                self._update_job(
                    job_id,
                    status="downloading",
                    progress_percent=max(1, min(percent, 90)),
                    status_detail=(
                        f"Downloading audio stream ({str(detail).strip()})"
                        if detail
                        else "Downloading audio stream"
                    ),
                )
            elif status == "finished":
                self._update_job(
                    job_id,
                    status="converting",
                    progress_percent=92,
                    status_detail="Audio download complete. Converting to MP3...",
                )

        self._update_job(
            job_id,
            status="downloading",
            progress_percent=2,
            status_detail="Preparing YouTube audio download...",
        )

        ffmpeg_binary = self._resolve_ffmpeg_binary()
        if ffmpeg_binary is None:
            raise DownloadRuntimeError(
                "ffmpeg could not be found. Install it or set FFMPEG_BINARY in backend/.env."
            )

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "ffmpeg_location": ffmpeg_binary,
            "progress_hooks": [progress_hook],
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([self._jobs[job_id].source_url])

        final_file = self._locate_final_file(job_dir)
        if final_file is None:
            raise DownloadRuntimeError(
                "The download completed but no MP3 file was produced. "
                "Make sure ffmpeg is installed and available on PATH."
            )

        self._update_job(
            job_id,
            status="completed",
            progress_percent=100,
            status_detail="MP3 is ready to save.",
            file_name=final_file.name,
            file_size_bytes=final_file.stat().st_size,
            file_path=final_file,
            thumbnail_path=thumbnail_path,
            error_message=None,
        )

    def _release_active_job(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return

            current = self._active_jobs_by_video_id.get(job.video_id)
            if current == job_id:
                self._active_jobs_by_video_id.pop(job.video_id, None)

    def _mark_failed(self, job_id: str, message: str) -> None:
        self._update_job(
            job_id,
            status="failed",
            progress_percent=0,
            status_detail="Download failed.",
            error_message=message,
        )

    def _update_job(self, job_id: str, **changes: object) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return

            for field_name, value in changes.items():
                setattr(job, field_name, value)

            job.updated_at = _utc_now()
            self._persist_registry_unlocked()

    def _wait_for_completion_sync(self, job_id: str, *, timeout_seconds: int) -> DownloadJob:
        deadline = datetime.now(timezone.utc).timestamp() + timeout_seconds

        while datetime.now(timezone.utc).timestamp() < deadline:
            job = self.get_job(job_id)
            if job.status == "completed":
                return job
            if job.status == "failed":
                raise DownloadRuntimeError(job.error_message or job.status_detail or "Download failed.")

            threading.Event().wait(0.5)

        raise DownloadRuntimeError("Timed out waiting for the required MP3 download.")

    @staticmethod
    def _locate_final_file(job_dir: Path) -> Path | None:
        matches = sorted(job_dir.glob("*.mp3"))
        if not matches:
            return None

        return matches[0]

    def _download_thumbnail(self, job_id: str, job_dir: Path) -> Path | None:
        with self._lock:
            job = self._jobs.get(job_id)
            thumbnail_url = job.thumbnail_url if job else None

        if not thumbnail_url:
            return None

        try:
            with httpx.Client(timeout=httpx.Timeout(10.0), follow_redirects=True) as client:
                response = client.get(thumbnail_url)
                response.raise_for_status()
        except httpx.HTTPError:
            return None

        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
        if not content_type.startswith("image/"):
            return None

        extension = mimetypes.guess_extension(content_type) or ".jpg"
        if extension == ".jpe":
            extension = ".jpg"

        thumbnail_path = job_dir / f"thumbnail{extension}"
        try:
            thumbnail_path.write_bytes(response.content)
        except OSError:
            return None

        return thumbnail_path

    @staticmethod
    def _normalize_title(title: str) -> str:
        normalized = " ".join(title.split()).strip()
        if not normalized:
            raise DownloadRuntimeError("Saved song title cannot be empty.")

        return normalized[:160]

    def _resolve_ffmpeg_binary(self) -> str | None:
        configured = self.settings.ffmpeg_binary.strip()
        if not configured:
            configured = "ffmpeg"

        configured_path = Path(configured)
        if configured_path.is_file():
            return str(configured_path)

        discovered = shutil.which(configured)
        if discovered:
            return discovered

        return None

    def _restore_jobs_from_disk(self) -> None:
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
                job = self._deserialize_job(item)
            except (KeyError, TypeError, ValueError):
                continue

            if job.status in ACTIVE_JOB_STATUSES:
                job.status = "failed"
                job.status_detail = "Download interrupted by backend restart."
                job.error_message = "The backend restarted before this job finished."
                job.progress_percent = 0
                job.file_name = None
                job.file_size_bytes = None
                job.file_path = None
                job.thumbnail_path = None
                job.updated_at = _utc_now()

            if job.status == "completed" and job.file_path and not job.file_path.exists():
                job.status = "failed"
                job.status_detail = "Recorded MP3 file is missing."
                job.error_message = "The saved MP3 file could not be found on disk."
                job.file_name = None
                job.file_size_bytes = None
                job.file_path = None
                job.thumbnail_path = None
                job.progress_percent = 0
                job.updated_at = _utc_now()

            self._jobs[job.id] = job

        with self._lock:
            self._persist_registry_unlocked()

    def _persist_registry_unlocked(self) -> None:
        payload = [self._serialize_job(job) for job in self._jobs.values()]
        self._registry_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )

    @staticmethod
    def _serialize_job(job: _DownloadRecord) -> dict[str, object]:
        return {
            "id": job.id,
            "video_id": job.video_id,
            "title": job.title,
            "channel_title": job.channel_title,
            "thumbnail_url": job.thumbnail_url,
            "source_url": job.source_url,
            "status": job.status,
            "status_detail": job.status_detail,
            "progress_percent": job.progress_percent,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "error_message": job.error_message,
            "file_name": job.file_name,
            "file_size_bytes": job.file_size_bytes,
            "file_path": str(job.file_path) if job.file_path else None,
            "thumbnail_path": str(job.thumbnail_path) if job.thumbnail_path else None,
        }

    @staticmethod
    def _deserialize_job(payload: dict[str, object]) -> _DownloadRecord:
        file_path = payload.get("file_path")
        thumbnail_path = payload.get("thumbnail_path")

        return _DownloadRecord(
            id=str(payload["id"]),
            video_id=str(payload["video_id"]),
            title=str(payload["title"]),
            channel_title=str(payload.get("channel_title", "")),
            thumbnail_url=str(payload["thumbnail_url"]) if payload.get("thumbnail_url") else None,
            source_url=str(payload["source_url"]),
            status=str(payload["status"]),
            status_detail=str(payload["status_detail"]) if payload.get("status_detail") else None,
            progress_percent=int(payload.get("progress_percent", 0)),
            created_at=str(payload["created_at"]),
            updated_at=str(payload["updated_at"]),
            error_message=str(payload["error_message"]) if payload.get("error_message") else None,
            file_name=str(payload["file_name"]) if payload.get("file_name") else None,
            file_size_bytes=(
                int(payload["file_size_bytes"]) if payload.get("file_size_bytes") is not None else None
            ),
            file_path=Path(str(file_path)) if file_path else None,
            thumbnail_path=Path(str(thumbnail_path)) if thumbnail_path else None,
        )


_download_manager: DownloadManager | None = None


def get_download_manager() -> DownloadManager:
    global _download_manager

    if _download_manager is None:
        _download_manager = DownloadManager()

    return _download_manager
