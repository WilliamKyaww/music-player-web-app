import html
import json
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.models.playlists import (
    AddPlaylistItemRequest,
    Playlist,
    PlaylistItem,
    ReorderPlaylistItemsRequest,
)

PLAYLISTS_REGISTRY_FILENAME = "playlists.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _decode_text(value: object, fallback: str = "") -> str:
    text = str(value if value is not None else fallback)
    return html.unescape(text)


class PlaylistError(RuntimeError):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(slots=True)
class _PlaylistItemRecord:
    id: str
    video_id: str
    title: str
    channel_title: str
    thumbnail_url: str | None
    source_url: str
    duration_label: str | None
    added_at: str
    position: int

    def to_public_model(self) -> PlaylistItem:
        return PlaylistItem(
            id=self.id,
            video_id=self.video_id,
            title=self.title,
            channel_title=self.channel_title,
            thumbnail_url=self.thumbnail_url,
            source_url=self.source_url,
            duration_label=self.duration_label,
            added_at=self.added_at,
            position=self.position,
        )


@dataclass(slots=True)
class _PlaylistRecord:
    id: str
    name: str
    created_at: str
    updated_at: str
    items: list[_PlaylistItemRecord] = field(default_factory=list)

    def to_public_model(self) -> Playlist:
        ordered_items = sorted(self.items, key=lambda item: item.position)
        return Playlist(
            id=self.id,
            name=self.name,
            created_at=self.created_at,
            updated_at=self.updated_at,
            items=[item.to_public_model() for item in ordered_items],
        )


class PlaylistManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.settings.playlists_dir.mkdir(parents=True, exist_ok=True)
        self._registry_path = self.settings.playlists_dir / PLAYLISTS_REGISTRY_FILENAME
        self._playlists: dict[str, _PlaylistRecord] = {}
        self._lock = threading.RLock()
        self._restore_from_disk()

    def list_playlists(self) -> list[Playlist]:
        with self._lock:
            ordered = sorted(
                self._playlists.values(),
                key=lambda playlist: playlist.updated_at,
                reverse=True,
            )
            return [playlist.to_public_model() for playlist in ordered]

    def create_playlist(self, name: str) -> Playlist:
        normalized = self._normalize_name(name)
        now = _utc_now()

        with self._lock:
            playlist = _PlaylistRecord(
                id=uuid4().hex,
                name=normalized,
                created_at=now,
                updated_at=now,
            )
            self._playlists[playlist.id] = playlist
            self._persist_unlocked()
            return playlist.to_public_model()

    def rename_playlist(self, playlist_id: str, name: str) -> Playlist:
        normalized = self._normalize_name(name)

        with self._lock:
            playlist = self._require_playlist_unlocked(playlist_id)
            playlist.name = normalized
            playlist.updated_at = _utc_now()
            self._persist_unlocked()
            return playlist.to_public_model()

    def delete_playlist(self, playlist_id: str) -> None:
        with self._lock:
            self._require_playlist_unlocked(playlist_id)
            self._playlists.pop(playlist_id, None)
            self._persist_unlocked()

    def add_item(self, playlist_id: str, request: AddPlaylistItemRequest) -> Playlist:
        with self._lock:
            playlist = self._require_playlist_unlocked(playlist_id)

            if any(item.video_id == request.video_id for item in playlist.items):
                raise PlaylistError("That video is already in this playlist.", status_code=409)

            position = len(playlist.items)
            playlist.items.append(
                _PlaylistItemRecord(
                    id=uuid4().hex,
                    video_id=request.video_id,
                    title=_decode_text(request.title),
                    channel_title=_decode_text(request.channel_title),
                    thumbnail_url=(
                        str(request.thumbnail_url) if request.thumbnail_url else None
                    ),
                    source_url=str(request.source_url),
                    duration_label=request.duration_label,
                    added_at=_utc_now(),
                    position=position,
                )
            )
            playlist.updated_at = _utc_now()
            self._persist_unlocked()
            return playlist.to_public_model()

    def remove_item(self, playlist_id: str, item_id: str) -> Playlist:
        with self._lock:
            playlist = self._require_playlist_unlocked(playlist_id)
            original_length = len(playlist.items)
            playlist.items = [item for item in playlist.items if item.id != item_id]

            if len(playlist.items) == original_length:
                raise PlaylistError("Playlist item not found.", status_code=404)

            self._reindex_items_unlocked(playlist)
            playlist.updated_at = _utc_now()
            self._persist_unlocked()
            return playlist.to_public_model()

    def reorder_items(
        self,
        playlist_id: str,
        request: ReorderPlaylistItemsRequest,
    ) -> Playlist:
        with self._lock:
            playlist = self._require_playlist_unlocked(playlist_id)
            existing_ids = [item.id for item in playlist.items]

            if sorted(existing_ids) != sorted(request.ordered_item_ids):
                raise PlaylistError(
                    "Reorder request must include every playlist item exactly once.",
                    status_code=400,
                )

            order_map = {item_id: index for index, item_id in enumerate(request.ordered_item_ids)}
            playlist.items.sort(key=lambda item: order_map[item.id])
            self._reindex_items_unlocked(playlist)
            playlist.updated_at = _utc_now()
            self._persist_unlocked()
            return playlist.to_public_model()

    def _normalize_name(self, name: str) -> str:
        normalized = " ".join(name.split()).strip()
        if not normalized:
            raise PlaylistError("Playlist name cannot be empty.", status_code=400)

        return normalized[:80]

    def _require_playlist_unlocked(self, playlist_id: str) -> _PlaylistRecord:
        playlist = self._playlists.get(playlist_id)
        if playlist is None:
            raise PlaylistError("Playlist not found.", status_code=404)

        return playlist

    @staticmethod
    def _reindex_items_unlocked(playlist: _PlaylistRecord) -> None:
        for index, item in enumerate(playlist.items):
            item.position = index

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
                playlist = self._deserialize_playlist(item)
            except (KeyError, TypeError, ValueError):
                continue

            self._playlists[playlist.id] = playlist

    def _persist_unlocked(self) -> None:
        payload = [self._serialize_playlist(playlist) for playlist in self._playlists.values()]
        self._registry_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )

    @staticmethod
    def _serialize_playlist(playlist: _PlaylistRecord) -> dict[str, object]:
        return {
            "id": playlist.id,
            "name": playlist.name,
            "created_at": playlist.created_at,
            "updated_at": playlist.updated_at,
            "items": [
                {
                    "id": item.id,
                    "video_id": item.video_id,
                    "title": item.title,
                    "channel_title": item.channel_title,
                    "thumbnail_url": item.thumbnail_url,
                    "source_url": item.source_url,
                    "duration_label": item.duration_label,
                    "added_at": item.added_at,
                    "position": item.position,
                }
                for item in playlist.items
            ],
        }

    @staticmethod
    def _deserialize_playlist(payload: dict[str, object]) -> _PlaylistRecord:
        items_payload = payload.get("items", [])
        items: list[_PlaylistItemRecord] = []

        if isinstance(items_payload, list):
            for raw_item in items_payload:
                if not isinstance(raw_item, dict):
                    continue

                items.append(
                    _PlaylistItemRecord(
                        id=str(raw_item["id"]),
                        video_id=str(raw_item["video_id"]),
                        title=_decode_text(raw_item["title"]),
                        channel_title=_decode_text(raw_item.get("channel_title", "")),
                        thumbnail_url=(
                            str(raw_item["thumbnail_url"])
                            if raw_item.get("thumbnail_url")
                            else None
                        ),
                        source_url=str(raw_item["source_url"]),
                        duration_label=(
                            str(raw_item["duration_label"])
                            if raw_item.get("duration_label")
                            else None
                        ),
                        added_at=str(raw_item["added_at"]),
                        position=int(raw_item.get("position", 0)),
                    )
                )

        items.sort(key=lambda item: item.position)

        return _PlaylistRecord(
            id=str(payload["id"]),
            name=_decode_text(payload["name"]),
            created_at=str(payload["created_at"]),
            updated_at=str(payload["updated_at"]),
            items=items,
        )


_playlist_manager: PlaylistManager | None = None


def get_playlist_manager() -> PlaylistManager:
    global _playlist_manager

    if _playlist_manager is None:
        _playlist_manager = PlaylistManager()

    return _playlist_manager
