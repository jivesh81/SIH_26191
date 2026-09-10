from fastapi import APIRouter

api_router = APIRouter()

# Health
@api_router.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}

# TODO: Add API routes
# from app.api.v1.endpoints import geo, optimize, simulate, audit
# api_router.include_router(geo.router, prefix="/geo", tags=["GIS"])
# api_router.include_router(optimize.router, prefix="/optimize", tags=["Optimization"])
# api_router.include_router(simulate.router, prefix="/simulate", tags=["Simulation"])
# api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])