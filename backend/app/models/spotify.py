from pydantic import BaseModel, HttpUrl


class SpotifyPreviewRequest(BaseModel):
    playlist_url: HttpUrl
    max_tracks: int = 20


class SpotifyPreviewTrack(BaseModel):
    spotify_track_id: str
    title: str
    artists: list[str]
    album: str | None = None
    duration_ms: int | None = None


class SpotifyPlaylistPreview(BaseModel):
    playlist_id: str
    playlist_name: str
    playlist_owner: str | None = None
    playlist_url: HttpUrl
    total_tracks: int
    preview_tracks: list[SpotifyPreviewTrack]
