from fastapi import APIRouter, HTTPException, Response, status

from app.models.playlists import (
    AddPlaylistItemRequest,
    CreatePlaylistRequest,
    Playlist,
    PlaylistListResponse,
    ReorderPlaylistItemsRequest,
    UpdatePlaylistRequest,
)
from app.services.playlists import PlaylistError, get_playlist_manager

router = APIRouter()


@router.get("/playlists", response_model=PlaylistListResponse)
async def list_playlists() -> PlaylistListResponse:
    manager = get_playlist_manager()
    return PlaylistListResponse(items=manager.list_playlists())


@router.post(
    "/playlists",
    response_model=Playlist,
    status_code=status.HTTP_201_CREATED,
)
async def create_playlist(request: CreatePlaylistRequest) -> Playlist:
    manager = get_playlist_manager()
    try:
        return manager.create_playlist(request.name)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.patch("/playlists/{playlist_id}", response_model=Playlist)
async def rename_playlist(playlist_id: str, request: UpdatePlaylistRequest) -> Playlist:
    manager = get_playlist_manager()
    try:
        return manager.rename_playlist(playlist_id, request.name)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.delete("/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(playlist_id: str) -> Response:
    manager = get_playlist_manager()
    try:
        manager.delete_playlist(playlist_id)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/playlists/{playlist_id}/items", response_model=Playlist)
async def add_playlist_item(
    playlist_id: str,
    request: AddPlaylistItemRequest,
) -> Playlist:
    manager = get_playlist_manager()
    try:
        return manager.add_item(playlist_id, request)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.delete("/playlists/{playlist_id}/items/{item_id}", response_model=Playlist)
async def remove_playlist_item(playlist_id: str, item_id: str) -> Playlist:
    manager = get_playlist_manager()
    try:
        return manager.remove_item(playlist_id, item_id)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.patch("/playlists/{playlist_id}/items/reorder", response_model=Playlist)
async def reorder_playlist_items(
    playlist_id: str,
    request: ReorderPlaylistItemsRequest,
) -> Playlist:
    manager = get_playlist_manager()
    try:
        return manager.reorder_items(playlist_id, request)
    except PlaylistError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
