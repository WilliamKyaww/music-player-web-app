from pydantic import BaseModel, HttpUrl


class CreateYouTubePlaylistExportRequest(BaseModel):
    playlist_url: HttpUrl
    export_format: str = "zip"
    delete_previous_exports_for_playlist: bool = False
