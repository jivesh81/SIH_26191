from fastapi import APIRouter

from app.api.v1.endpoints import core

api_router = APIRouter()

# Health check
api_router.include_router(core.router, tags=["Core"])

# API routes are mounted under /api/v1 in main.py