from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.models.discord_presence import (
    DiscordPresenceActivityRequest,
    DiscordPresenceStatus,
)
from app.services.discord_presence import get_discord_presence_manager
from app.services.discord_thumbnails import (
    DiscordThumbnailError,
    get_discord_thumbnail_manager,
)

router = APIRouter()


@router.get("/discord-presence", response_model=DiscordPresenceStatus)
async def get_discord_presence_status() -> DiscordPresenceStatus:
    manager = get_discord_presence_manager()
    return manager.get_status()


@router.get("/discord-presence/thumbnails/{video_id}")
async def get_discord_presence_thumbnail(video_id: str) -> FileResponse:
    manager = get_discord_thumbnail_manager()

    try:
        file_path = manager.get_thumbnail_path(video_id)
    except DiscordThumbnailError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        filename=file_path.name,
    )


@router.put("/discord-presence/activity", response_model=DiscordPresenceStatus)
async def update_discord_presence_activity(
    request: DiscordPresenceActivityRequest,
) -> DiscordPresenceStatus:
    manager = get_discord_presence_manager()
    return await manager.update_activity(request)


@router.delete("/discord-presence/activity", response_model=DiscordPresenceStatus)
async def clear_discord_presence_activity() -> DiscordPresenceStatus:
    manager = get_discord_presence_manager()
    return await manager.clear_activity()
