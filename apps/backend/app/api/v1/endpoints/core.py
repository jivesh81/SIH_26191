"""
API Endpoints for Aapda Setu - Core Data Access.

Provides read-only access to synthetic demo data for Barpeta district.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.schemas.domain import (
    HabitationResponse,
    HabitationListResponse,
    SiteResponse,
    SiteListResponse,
    RouteResponse,
    RouteListResponse,
    HazardResponse,
    HazardListResponse,
    ShelterResponse,
    ShelterListResponse,
    DashboardResponse,
    DisasterEvent,
    EventListResponse,
)

from app.services.data_layer import (
    get_habitations,
    get_habitation_by_id,
    get_sites,
    get_site_by_id,
    get_routes,
    get_route_by_id,
    get_hazards,
    get_hazard_by_id,
    get_shelters,
    get_shelter_by_id,
    get_dashboard,
    get_accessible_habitations,
    get_high_vulnerability_habitations,
    get_open_routes,
    get_active_shelters,
    get_available_sites,
)

router = APIRouter()


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health", tags=["Health"], summary="Health check endpoint")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "service": "Aapda Setu API",
        "version": "0.1.0",
        "data_mode": "local_synthetic_demo",
    }


# =============================================================================
# Dashboard
# =============================================================================

@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    tags=["Dashboard"],
    summary="Get dashboard statistics",
    description="Returns calculated statistics from synthetic Barpeta demo data.",
)
async def get_dashboard_data():
    """Get dashboard with computed statistics from demo data."""
    return get_dashboard()


# =============================================================================
# Habitations
# =============================================================================

@router.get(
    "/habitations",
    response_model=HabitationListResponse,
    tags=["Habitations"],
    summary="List all vulnerable habitations",
    description="Returns all vulnerable habitations from synthetic Barpeta demo data.",
)
async def list_habitations(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    accessible_only: bool = Query(False, description="Filter to accessible only"),
    min_vulnerability: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum vulnerability score"),
):
    """List vulnerable habitations with optional filtering."""
    habitations = get_habitations()
    
    if accessible_only:
        habitations = [h for h in habitations if h.is_accessible]
    
    if min_vulnerability is not None:
        habitations = [h for h in habitations if h.vulnerability_score >= min_vulnerability]
    
    # Sort by priority rank
    habitations.sort(key=lambda h: h.priority_rank or 999)
    
    total = len(habitations)
    start = (page - 1) * page_size
    end = start + page_size
    
    return HabitationListResponse(
        habitations=habitations[start:end],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/habitations/{habitation_id}",
    response_model=HabitationResponse,
    tags=["Habitations"],
    summary="Get habitation by ID",
)
async def get_habitation(habitation_id: str):
    """Get a single habitation by ID."""
    habitation = get_habitation_by_id(habitation_id)
    if not habitation:
        raise HTTPException(status_code=404, detail=f"Habitation {habitation_id} not found")
    return habitation


@router.get(
    "/habitations/high-vulnerability",
    response_model=List[HabitationResponse],
    tags=["Habitations"],
    summary="Get high vulnerability habitations",
    description="Returns habitations with vulnerability score >= threshold (default 0.7).",
)
async def get_high_vuln_habitations(
    threshold: float = Query(0.7, ge=0.0, le=1.0, description="Vulnerability threshold"),
):
    """Get high vulnerability habitations."""
    return get_high_vulnerability_habitations(threshold)


# =============================================================================
# Relocation Sites
# =============================================================================

@router.get(
    "/sites",
    response_model=SiteListResponse,
    tags=["Sites"],
    summary="List all relocation sites",
    description="Returns all candidate relocation sites from synthetic Barpeta demo data.",
)
async def list_sites(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    available_only: bool = Query(False, description="Filter to sites with available capacity"),
):
    """List relocation sites with optional filtering."""
    sites = get_sites()
    
    if available_only:
        sites = [s for s in sites if s.available_capacity > 0]
    
    # Sort by suitability score descending
    sites.sort(key=lambda s: s.suitability_score, reverse=True)
    
    total = len(sites)
    start = (page - 1) * page_size
    end = start + page_size
    
    return SiteListResponse(
        sites=sites[start:end],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/sites/{site_id}",
    response_model=SiteResponse,
    tags=["Sites"],
    summary="Get relocation site by ID",
)
async def get_site(site_id: str):
    """Get a single relocation site by ID."""
    site = get_site_by_id(site_id)
    if not site:
        raise HTTPException(status_code=404, detail=f"Relocation site {site_id} not found")
    return site


# =============================================================================
# Evacuation Routes
# =============================================================================

@router.get(
    "/routes",
    response_model=RouteListResponse,
    tags=["Routes"],
    summary="List all evacuation routes",
    description="Returns all evacuation routes from synthetic Barpeta demo data.",
)
async def list_routes(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    open_only: bool = Query(False, description="Filter to open routes only"),
    route_type: Optional[str] = Query(None, description="Filter by route type (primary/alternative/contingency)"),
):
    """List evacuation routes with optional filtering."""
    routes = get_routes()
    
    if open_only:
        routes = [r for r in routes if r.status == "open"]
    
    if route_type:
        routes = [r for r in routes if r.route_type == route_type]
    
    total = len(routes)
    start = (page - 1) * page_size
    end = start + page_size
    
    return RouteListResponse(
        routes=routes[start:end],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/routes/{route_id}",
    response_model=RouteResponse,
    tags=["Routes"],
    summary="Get evacuation route by ID",
)
async def get_route(route_id: str):
    """Get a single evacuation route by ID."""
    route = get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")
    return route


@router.get(
    "/routes/feasible",
    response_model=List[RouteResponse],
    tags=["Routes"],
    summary="Get feasible (open) routes",
)
async def get_feasible_routes():
    """Get all feasible (open) routes."""
    return get_open_routes()


# =============================================================================
# Hazards
# =============================================================================

@router.get(
    "/hazards",
    response_model=HazardListResponse,
    tags=["Hazards"],
    summary="List all hazard zones",
    description="Returns all hazard zones from synthetic Barpeta demo data.",
)
async def list_hazards(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    hazard_type: Optional[str] = Query(None, description="Filter by hazard type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
):
    """List hazard zones with optional filtering."""
    hazards = get_hazards()
    
    if hazard_type:
        hazards = [h for h in hazards if h.hazard_type == hazard_type]
    
    if severity:
        hazards = [h for h in hazards if h.severity == severity]
    
    total = len(hazards)
    start = (page - 1) * page_size
    end = start + page_size
    
    return HazardListResponse(
        hazards=hazards[start:end],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/hazards/{hazard_id}",
    response_model=HazardResponse,
    tags=["Hazards"],
    summary="Get hazard zone by ID",
)
async def get_hazard(hazard_id: str):
    """Get a single hazard zone by ID."""
    hazard = get_hazard_by_id(hazard_id)
    if not hazard:
        raise HTTPException(status_code=404, detail=f"Hazard zone {hazard_id} not found")
    return hazard


# =============================================================================
# Shelters
# =============================================================================

@router.get(
    "/shelters",
    response_model=ShelterListResponse,
    tags=["Shelters"],
    summary="List all shelters",
    description="Returns all shelters from synthetic Barpeta demo data.",
)
async def list_shelters(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    active_only: bool = Query(True, description="Filter to active shelters only"),
):
    """List shelters with optional filtering."""
    shelters = get_shelters()
    
    if active_only:
        shelters = [s for s in shelters if s.is_active]
    
    total = len(shelters)
    start = (page - 1) * page_size
    end = start + page_size
    
    return ShelterListResponse(
        shelters=shelters[start:end],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/shelters/{shelter_id}",
    response_model=ShelterResponse,
    tags=["Shelters"],
    summary="Get shelter by ID",
)
async def get_shelter(shelter_id: str):
    """Get a single shelter by ID."""
    shelter = get_shelter_by_id(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail=f"Shelter {shelter_id} not found")
    return shelter


# =============================================================================
# Events (Disaster Simulation)
# =============================================================================

@router.get(
    "/events",
    response_model=EventListResponse,
    tags=["Events"],
    summary="List example disaster events",
    description="Returns example disaster events for simulation testing.",
)
async def list_events():
    """Get example disaster events for simulation."""
    # These are example events for the demo - not from GeoJSON
    events = [
        DisasterEvent(
            event_type="rainfall",
            intensity=0.8,
            affected_area={"min_lng": 90.5, "min_lat": 26.1, "max_lng": 91.5, "max_lat": 26.8},
            duration_hours=48,
            metadata={"rainfall_mm": 250, "return_period_years": 25},
        ),
        DisasterEvent(
            event_type="bridge_collapse",
            intensity=1.0,
            affected_area={"min_lng": 90.9, "min_lat": 26.3, "max_lng": 91.0, "max_lat": 26.4},
            duration_hours=720,
            metadata={"bridge_id": "bridge_beki", "cause": "flood_damage"},
        ),
        DisasterEvent(
            event_type="capacity_reduction",
            intensity=0.5,
            affected_area={"min_lng": 91.0, "min_lat": 26.2, "max_lng": 91.3, "max_lat": 26.5},
            duration_hours=168,
            metadata={"shelter_ids": ["shelter_rc_barpeta", "shelter_rc_howly"], "reduction_pct": 50},
        ),
    ]
    
    return EventListResponse(events=events, total=len(events))