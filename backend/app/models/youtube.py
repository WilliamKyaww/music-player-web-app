from pydantic import BaseModel, HttpUrl


class VideoSearchResult(BaseModel):
    id: str
    title: str
    channel_title: str
    channel_id: str
    description: str
    thumbnail_url: HttpUrl
    duration_iso: str
    duration_label: str
    published_at: str
    video_url: HttpUrl


class SearchResponse(BaseModel):
    query: str
    total: int
    items: list[VideoSearchResult]
