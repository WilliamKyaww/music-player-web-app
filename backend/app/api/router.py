from fastapi import APIRouter

from app.api.downloads import router as downloads_router
from app.api.exports import router as exports_router
from app.api.playlists import router as playlists_router
from app.api.search import router as search_router
from app.api.spotify import router as spotify_router
from app.api.youtube_playlists import router as youtube_playlists_router

api_router = APIRouter()
api_router.include_router(search_router, tags=["search"])
api_router.include_router(downloads_router, tags=["downloads"])
api_router.include_router(exports_router, tags=["exports"])
api_router.include_router(playlists_router, tags=["playlists"])
api_router.include_router(spotify_router, tags=["spotify"])
api_router.include_router(youtube_playlists_router, tags=["youtube-playlists"])
