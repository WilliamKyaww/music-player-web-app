from fastapi import APIRouter

from app.models.discord_presence import (
    DiscordPresenceActivityRequest,
    DiscordPresenceStatus,
)
from app.services.discord_presence import get_discord_presence_manager

router = APIRouter()


@router.get("/discord-presence", response_model=DiscordPresenceStatus)
async def get_discord_presence_status() -> DiscordPresenceStatus:
    manager = get_discord_presence_manager()
    return manager.get_status()


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
