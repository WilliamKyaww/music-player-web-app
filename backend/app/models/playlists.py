from pydantic import BaseModel, HttpUrl


class PlaylistItem(BaseModel):
    id: str
    video_id: str
    title: str
    channel_title: str
    thumbnail_url: HttpUrl | None = None
    source_url: HttpUrl
    duration_label: str | None = None
    added_at: str
    position: int


class Playlist(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str
    items: list[PlaylistItem]


class PlaylistListResponse(BaseModel):
    items: list[Playlist]


class CreatePlaylistRequest(BaseModel):
    name: str


class UpdatePlaylistRequest(BaseModel):
    name: str


class AddPlaylistItemRequest(BaseModel):
    video_id: str
    title: str
    channel_title: str = ""
    thumbnail_url: HttpUrl | None = None
    source_url: HttpUrl
    duration_label: str | None = None


class ReorderPlaylistItemsRequest(BaseModel):
    ordered_item_ids: list[str]
