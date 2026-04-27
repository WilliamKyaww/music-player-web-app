from __future__ import annotations

import time
from threading import RLock

from app.core.config import get_settings
from app.models.discord_presence import (
    DiscordPresenceActivityRequest,
    DiscordPresenceStatus,
)

try:
    from pypresence import Presence
except ImportError:  # pragma: no cover - dependency is expected in normal runtime
    Presence = None


def _truncate(value: str, max_length: int = 128) -> str:
    text = value.strip()
    if len(text) <= max_length:
        return text
    return text[: max_length - 3].rstrip() + "..."


class DiscordPresenceManager:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._lock = RLock()
        self._rpc: Presence | None = None
        self._connected = False
        self._active = False
        self._last_error: str | None = None

    def _build_status(self) -> DiscordPresenceStatus:
        return DiscordPresenceStatus(
            enabled=self.enabled,
            configured=self.configured,
            available=self.available,
            connected=self._connected,
            active=self._active,
            last_error=self._last_error,
        )

    @property
    def enabled(self) -> bool:
        return self._settings.discord_presence_enabled

    @property
    def configured(self) -> bool:
        return bool(self._settings.discord_client_id)

    @property
    def available(self) -> bool:
        return Presence is not None

    def get_status(self) -> DiscordPresenceStatus:
        with self._lock:
            return self._build_status()

    def _ensure_connection(self) -> bool:
        if not self.enabled or not self.configured or not self.available:
            return False

        if self._connected and self._rpc is not None:
            return True

        try:
            self._rpc = Presence(self._settings.discord_client_id)
            self._rpc.connect()
        except Exception as exc:  # pragma: no cover - depends on local Discord runtime
            self._rpc = None
            self._connected = False
            self._last_error = str(exc)
            return False

        self._connected = True
        self._last_error = None
        return True

    def update_activity(
        self,
        activity: DiscordPresenceActivityRequest,
    ) -> DiscordPresenceStatus:
        with self._lock:
            if not self._ensure_connection():
                self._active = False
                return self._build_status()

            assert self._rpc is not None

            subtitle_parts = []
            if activity.channel_title:
                subtitle_parts.append(activity.channel_title)
            if activity.is_playlist_playback and activity.playlist_name:
                subtitle_parts.append(f'Playlist: {activity.playlist_name}')

            state_text = " | ".join(subtitle_parts) or "MusicBox"
            details_text = _truncate(activity.title)

            payload: dict[str, object] = {
                "details": details_text,
                "state": _truncate(
                    f"Paused | {state_text}" if not activity.is_playing else state_text,
                ),
                "large_text": "MusicBox",
            }

            if activity.source_url:
                payload["buttons"] = [
                    {"label": "Open source", "url": activity.source_url},
                ]

            if activity.is_playing:
                payload["start"] = int(time.time()) - max(0, activity.position_seconds)
                if activity.duration_seconds and activity.duration_seconds > 0:
                    payload["end"] = (
                        int(time.time())
                        - max(0, activity.position_seconds)
                        + activity.duration_seconds
                    )

            if not activity.is_playing:
                payload.pop("buttons", None)

            try:
                self._rpc.update(**payload)
            except Exception as exc:  # pragma: no cover - depends on local Discord runtime
                self._connected = False
                self._active = False
                self._last_error = str(exc)
                return self._build_status()

            self._active = True
            self._last_error = None
            return self._build_status()

    def clear_activity(self) -> DiscordPresenceStatus:
        with self._lock:
            if self._rpc is not None and self._connected:
                try:
                    self._rpc.clear()
                except Exception as exc:  # pragma: no cover - depends on local Discord runtime
                    self._connected = False
                    self._last_error = str(exc)
                    self._active = False
                    return self._build_status()

            self._active = False
            self._last_error = None
            return self._build_status()


_discord_presence_manager = DiscordPresenceManager()


def get_discord_presence_manager() -> DiscordPresenceManager:
    return _discord_presence_manager
