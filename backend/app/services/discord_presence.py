from __future__ import annotations

import asyncio
import sys
import time
from threading import Event, RLock, Thread

from app.core.config import get_settings
from app.models.discord_presence import (
    DiscordPresenceActivityRequest,
    DiscordPresenceStatus,
)

try:
    from pypresence import AioPresence
except ImportError:  # pragma: no cover - dependency is expected in normal runtime
    AioPresence = None


def _truncate(value: str, max_length: int = 128) -> str:
    text = value.strip()
    if len(text) <= max_length:
        return text
    return text[: max_length - 3].rstrip() + "..."


class DiscordPresenceManager:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._lock = asyncio.Lock()
        self._worker_lock = RLock()
        self._worker_loop: asyncio.AbstractEventLoop | None = None
        self._worker_thread: Thread | None = None
        self._rpc: AioPresence | None = None
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
        return AioPresence is not None

    def get_status(self) -> DiscordPresenceStatus:
        return self._build_status()

    def _create_presence_loop(self) -> asyncio.AbstractEventLoop:
        proactor_loop = getattr(asyncio, "ProactorEventLoop", None)
        if sys.platform == "win32" and proactor_loop is not None:
            return proactor_loop()
        return asyncio.new_event_loop()

    def _ensure_worker_loop(self) -> asyncio.AbstractEventLoop:
        with self._worker_lock:
            if self._worker_loop is not None and self._worker_loop.is_running():
                return self._worker_loop

            loop = self._create_presence_loop()
            ready = Event()

            def run_loop() -> None:
                asyncio.set_event_loop(loop)
                ready.set()
                loop.run_forever()

            thread = Thread(
                target=run_loop,
                name="musicbox-discord-presence",
                daemon=True,
            )
            thread.start()

            if not ready.wait(timeout=5):
                raise RuntimeError("Discord presence worker loop did not start.")

            self._worker_loop = loop
            self._worker_thread = thread
            return loop

    async def _run_on_presence_loop(self, coro: object) -> object:
        loop = self._ensure_worker_loop()
        future = asyncio.run_coroutine_threadsafe(coro, loop)
        return await asyncio.wrap_future(future)

    async def _connect_rpc(self) -> None:
        if self._connected and self._rpc is not None:
            return

        if AioPresence is None:
            raise RuntimeError("pypresence is not installed.")

        try:
            self._rpc = AioPresence(self._settings.discord_client_id)
            await self._rpc.connect()
        except Exception:
            self._rpc = None
            self._connected = False
            raise

        self._connected = True
        self._last_error = None

    async def _update_rpc(self, payload: dict[str, object]) -> None:
        await self._connect_rpc()
        assert self._rpc is not None
        await self._rpc.update(**payload)

    async def _clear_rpc(self) -> None:
        if self._rpc is not None and self._connected:
            await self._rpc.clear()

    async def update_activity(
        self,
        activity: DiscordPresenceActivityRequest,
    ) -> DiscordPresenceStatus:
        async with self._lock:
            if not self.enabled or not self.configured or not self.available:
                self._active = False
                return self._build_status()

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

            if activity.thumbnail_url:
                payload["large_image"] = activity.thumbnail_url
                payload["large_text"] = details_text

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
                await self._run_on_presence_loop(self._update_rpc(payload))
            except Exception as exc:  # pragma: no cover - depends on local Discord runtime
                self._rpc = None
                self._connected = False
                self._active = False
                self._last_error = str(exc)
                return self._build_status()

            self._active = True
            self._last_error = None
            return self._build_status()

    async def clear_activity(self) -> DiscordPresenceStatus:
        async with self._lock:
            try:
                await self._run_on_presence_loop(self._clear_rpc())
            except Exception as exc:  # pragma: no cover - depends on local Discord runtime
                self._rpc = None
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
