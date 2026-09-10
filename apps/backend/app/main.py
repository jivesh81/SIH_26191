from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # No database initialization needed for local demo data
    # Database initialization would go here when PostgreSQL/PostGIS is added
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Aapda Setu - Disaster Management Decision Support System API\n\n"
                "**Note**: This API serves synthetic/demo data for Barpeta district, Assam. "
                "All data is synthetic and for SIH 2026 demonstration purposes only. "
                "NOT official government data.",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "data_mode": "local_synthetic_demo",
    }


@app.get("/ready", tags=["Health"])
async def readiness_check():
    return {
        "status": "ready",
        "service": settings.APP_NAME,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)