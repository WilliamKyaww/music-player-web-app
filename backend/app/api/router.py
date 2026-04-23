from fastapi import APIRouter

from app.api.downloads import router as downloads_router
from app.api.search import router as search_router

api_router = APIRouter()
api_router.include_router(search_router, tags=["search"])
api_router.include_router(downloads_router, tags=["downloads"])
