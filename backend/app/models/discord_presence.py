from pydantic import BaseModel


class DiscordPresenceStatus(BaseModel):
    enabled: bool
    configured: bool
    available: bool
    connected: bool
    active: bool
    last_error: str | None = None


class DiscordPresenceActivityRequest(BaseModel):
    video_id: str
    title: str
    channel_title: str | None = None
    playlist_name: str | None = None
    source_url: str | None = None
    is_playing: bool = True
    is_playlist_playback: bool = False
    position_seconds: int = 0
    duration_seconds: int | None = None
