"""
API Endpoints for Aapda Setu - Core Data Access.

Provides read-only access to synthetic demo data for Barpeta district.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict

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
    RiskAssessmentResponse,
    RiskAssessmentListResponse,
    EffectiveCapacityResponse,
    EffectiveCapacityListResponse,
    CapacityConstraintResponse,
    RouteFeasibilityResponse,
    RouteFeasibilityListResponse,
    RiskLevel,
    RelocationOptimizationResponse,
    PlanVersionResponse,
    EventTriggerResponse,
    EventLogResponse,
    ActivePlanResponse,
    PredictedRiskRequest,
    PredictedRiskResponse,
    PredictedRiskListResponse,
    SMSLogEntry,
    SMSLogResponse,
    PlanApprovalRequest,
    PlanApprovalResponse,
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

from app.services.intelligence import (
    get_all_risk_assessments,
    get_risk_assessment,
    get_red_zone_habitations,
    get_all_effective_capacities,
    get_effective_capacity,
    check_route_feasibility,
    check_all_routes_for_site,
    check_all_routes_from_habitation,
)
from app.ml.risk_predictor import get_predictor, predict_risk_score
from app.services.sms import get_sms_service

from app.services.optimization import run_relocation_optimization
from app.services.events import event_service, EventService

router = APIRouter()


# =============================================================================
# Health Check
# =============================================================================

@router.get(
    "/health",
    tags=["Health"],
    summary="Health check endpoint",
)
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
    accessible_only: bool = Query(
        False,
        description="Filter to accessible only",
    ),
    min_vulnerability: Optional[float] = Query(
        None,
        ge=0.0,
        le=1.0,
        description="Minimum vulnerability score",
    ),
):
    """List vulnerable habitations with optional filtering."""
    habitations = get_habitations()

    if accessible_only:
        habitations = [
            h for h in habitations
            if h.is_accessible
        ]

    if min_vulnerability is not None:
        habitations = [
            h for h in habitations
            if h.vulnerability_score >= min_vulnerability
        ]

    habitations.sort(
        key=lambda h: h.priority_rank or 999
    )

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
    "/habitations/high-vulnerability",
    response_model=List[HabitationResponse],
    tags=["Habitations"],
    summary="Get high vulnerability habitations",
    description="Returns habitations with vulnerability score >= threshold (default 0.7).",
)
async def get_high_vuln_habitations(
    threshold: float = Query(
        0.7,
        ge=0.0,
        le=1.0,
        description="Vulnerability threshold",
    ),
):
    """Get high vulnerability habitations."""
    return get_high_vulnerability_habitations(threshold)


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
        raise HTTPException(
            status_code=404,
            detail=f"Habitation {habitation_id} not found",
        )

    return habitation


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
    page: int = Query(1, ge=1, le=200, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    available_only: bool = Query(
        False,
        description="Filter to sites with available capacity",
    ),
):
    """List relocation sites with optional filtering."""
    sites = get_sites()

    if available_only:
        sites = [
            s for s in sites
            if s.available_capacity > 0
        ]

    sites.sort(
        key=lambda s: s.suitability_score,
        reverse=True,
    )

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
        raise HTTPException(
            status_code=404,
            detail=f"Relocation site {site_id} not found",
        )

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
    open_only: bool = Query(
        False,
        description="Filter to open routes only",
    ),
    route_type: Optional[str] = Query(
        None,
        description="Filter by route type (primary/alternative/contingency)",
    ),
):
    """List evacuation routes with optional filtering."""
    routes = get_routes()

    if open_only:
        routes = [
            r for r in routes
            if r.status == "open"
        ]

    if route_type:
        routes = [
            r for r in routes
            if r.route_type == route_type
        ]

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
    "/routes/feasible",
    response_model=List[RouteResponse],
    tags=["Routes"],
    summary="Get feasible (open) routes",
)
async def get_feasible_routes():
    """Get all feasible (open) routes."""
    return get_open_routes()


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
        raise HTTPException(
            status_code=404,
            detail=f"Route {route_id} not found",
        )

    return route


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
    hazard_type: Optional[str] = Query(
        None,
        description="Filter by hazard type",
    ),
    severity: Optional[str] = Query(
        None,
        description="Filter by severity",
    ),
):
    """List hazard zones with optional filtering."""
    hazards = get_hazards()

    if hazard_type:
        hazards = [
            h for h in hazards
            if h.hazard_type == hazard_type
        ]

    if severity:
        hazards = [
            h for h in hazards
            if h.severity == severity
        ]

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
        raise HTTPException(
            status_code=404,
            detail=f"Hazard zone {hazard_id} not found",
        )

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
    active_only: bool = Query(
        True,
        description="Filter to active shelters only",
    ),
):
    """List shelters with optional filtering."""
    shelters = get_shelters()

    if active_only:
        shelters = [
            s for s in shelters
            if s.is_active
        ]

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
        raise HTTPException(
            status_code=404,
            detail=f"Shelter {shelter_id} not found",
        )

    return shelter


# =============================================================================
# Events
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
    events = [
        DisasterEvent(
            event_type="rainfall",
            intensity=0.8,
            affected_area={
                "min_lng": 90.5,
                "min_lat": 26.1,
                "max_lng": 91.5,
                "max_lat": 26.8,
            },
            duration_hours=48,
            metadata={
                "rainfall_mm": 250,
                "return_period_years": 25,
            },
        ),
        DisasterEvent(
            event_type="bridge_collapse",
            intensity=1.0,
            affected_area={
                "min_lng": 90.9,
                "min_lat": 26.3,
                "max_lng": 91.0,
                "max_lat": 26.4,
            },
            duration_hours=720,
            metadata={
                "bridge_id": "bridge_beki",
                "cause": "flood_damage",
            },
        ),
        DisasterEvent(
            event_type="capacity_reduction",
            intensity=0.5,
            affected_area={
                "min_lng": 91.0,
                "min_lat": 26.2,
                "max_lng": 91.3,
                "max_lat": 26.5,
            },
            duration_hours=168,
            metadata={
                "shelter_ids": [
                    "shelter_rc_barpeta",
                    "shelter_rc_howly",
                ],
                "reduction_pct": 50,
            },
        ),
    ]

    return EventListResponse(
        events=events,
        total=len(events),
    )


# =============================================================================
# Core Intelligence - Risk
# =============================================================================

@router.get(
    "/intelligence/risk",
    response_model=RiskAssessmentListResponse,
    tags=["Intelligence"],
    summary="Get risk assessments for all habitations",
    description="Returns deterministic risk scores and classifications for all habitations.",
)
async def get_risk_assessments():
    """Get risk assessments for all habitations."""
    assessments = get_all_risk_assessments()

    red_zone = sum(
        1
        for a in assessments
        if a.risk_level == RiskLevel.RED_ZONE
    )

    high = sum(
        1
        for a in assessments
        if a.risk_level == RiskLevel.HIGH
    )

    medium = sum(
        1
        for a in assessments
        if a.risk_level == RiskLevel.MEDIUM
    )

    low = sum(
        1
        for a in assessments
        if a.risk_level == RiskLevel.LOW
    )

    response_assessments = [
        RiskAssessmentResponse(
            habitation_id=a.habitation_id,
            habitation_name=a.habitation_name,
            total_score=a.total_score,
            risk_level=a.risk_level,
            factors=a.factors,
            explanation=a.explanation,
        )
        for a in assessments
    ]

    return RiskAssessmentListResponse(
        assessments=response_assessments,
        total=len(assessments),
        red_zone_count=red_zone,
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
    )


# IMPORTANT:
# This static route MUST appear before /intelligence/risk/{habitation_id}.
# Otherwise FastAPI can interpret "red-zone" as a habitation_id.
@router.get(
    "/intelligence/risk/red-zone",
    response_model=List[RiskAssessmentResponse],
    tags=["Intelligence"],
    summary="Get all RED_ZONE habitations",
)
async def get_red_zone():
    """Get all habitations classified as RED_ZONE."""
    assessments = get_red_zone_habitations()

    return [
        RiskAssessmentResponse(
            habitation_id=a.habitation_id,
            habitation_name=a.habitation_name,
            total_score=a.total_score,
            risk_level=a.risk_level,
            factors=a.factors,
            explanation=a.explanation,
        )
        for a in assessments
    ]


@router.get(
    "/intelligence/risk/{habitation_id}",
    response_model=RiskAssessmentResponse,
    tags=["Intelligence"],
    summary="Get risk assessment for a single habitation",
)
async def get_habitation_risk(habitation_id: str):
    """Get risk assessment for a specific habitation."""
    assessment = get_risk_assessment(habitation_id)

    if not assessment:
        raise HTTPException(
            status_code=404,
            detail=f"Habitation {habitation_id} not found",
        )

    return RiskAssessmentResponse(
        habitation_id=assessment.habitation_id,
        habitation_name=assessment.habitation_name,
        total_score=assessment.total_score,
        risk_level=assessment.risk_level,
        factors=assessment.factors,
        explanation=assessment.explanation,
    )


# =============================================================================
# Core Intelligence - ML Predictive Risk
# =============================================================================

@router.post(
    "/intelligence/risk/predict",
    response_model=PredictedRiskResponse,
    tags=["Intelligence"],
    summary="Get ML-enhanced risk prediction for a habitation",
    description="Returns probabilistic risk prediction using trained ML model alongside deterministic score.",
)
async def predict_risk(request: PredictedRiskRequest):
    """Get ML-enhanced risk prediction for a single habitation."""
    from app.services.data_layer import get_habitation_by_id

    habitation = get_habitation_by_id(request.habitation_id)
    if not habitation:
        raise HTTPException(
            status_code=404,
            detail=f"Habitation {request.habitation_id} not found",
        )

    # Get deterministic assessment
    det = get_risk_assessment(request.habitation_id)

    # Get ML prediction
    ml_result = predict_risk_score(habitation, request.weather)
    predictor = get_predictor()
    ml_risk, probs = predictor.predict(habitation, request.weather)

    return PredictedRiskResponse(
        habitation_id=habitation.id,
        habitation_name=habitation.name,
        deterministic_risk_level=det.risk_level,
        ml_risk_level=ml_risk,
        final_risk_level=ml_result.risk_level,
        ml_probabilities=probs,
        explanation=ml_result.explanation,
    )


@router.post(
    "/intelligence/risk/predict/batch",
    response_model=PredictedRiskListResponse,
    tags=["Intelligence"],
    summary="Get ML-enhanced risk predictions for all habitations",
    description="Returns probabilistic risk predictions for all habitations.",
)
async def predict_risk_batch(weather: Optional[Dict[str, float]] = None):
    """Get ML-enhanced risk predictions for all habitations."""
    from app.services.data_layer import get_habitations

    habitations = get_habitations()
    predictor = get_predictor()

    predictions = []
    for habitation in habitations:
        det = get_risk_assessment(habitation.id)
        ml_risk, probs = predictor.predict(habitation, weather)
        ml_result = predict_risk_score(habitation, weather)

        predictions.append(PredictedRiskResponse(
            habitation_id=habitation.id,
            habitation_name=habitation.name,
            deterministic_risk_level=det.risk_level,
            ml_risk_level=ml_risk,
            final_risk_level=ml_result.risk_level,
            ml_probabilities=probs,
            explanation=ml_result.explanation,
        ))

    return PredictedRiskListResponse(predictions=predictions, total=len(predictions))


# =============================================================================
# Core Intelligence - Effective Capacity
# =============================================================================

@router.get(
    "/intelligence/capacity",
    response_model=EffectiveCapacityListResponse,
    tags=["Intelligence"],
    summary="Get effective capacities for all relocation sites",
    description="Returns C_effective = min(space, water, sanitation, health, food, road, safety) for each site.",
)
async def get_effective_capacities():
    """Get effective capacities for all sites."""
    capacities = get_all_effective_capacities()

    response_capacities = [
        EffectiveCapacityResponse(
            site_id=c.site_id,
            site_name=c.site_name,
            physical_capacity=c.physical_capacity,
            effective_capacity=c.effective_capacity,
            limiting_constraint=c.limiting_constraint,
            constraints=[
                CapacityConstraintResponse(
                    name=cc.name,
                    available=cc.available,
                    is_limiting=cc.is_limiting,
                )
                for cc in c.constraints
            ],
            explanation=c.explanation,
        )
        for c in capacities
    ]

    return EffectiveCapacityListResponse(
        capacities=response_capacities,
        total=len(capacities),
    )


@router.get(
    "/intelligence/capacity/{site_id}",
    response_model=EffectiveCapacityResponse,
    tags=["Intelligence"],
    summary="Get effective capacity for a single site",
)
async def get_site_capacity(site_id: str):
    """Get effective capacity for a specific site."""
    capacity = get_effective_capacity(site_id)

    if not capacity:
        raise HTTPException(
            status_code=404,
            detail=f"Site {site_id} not found",
        )

    return EffectiveCapacityResponse(
        site_id=capacity.site_id,
        site_name=capacity.site_name,
        physical_capacity=capacity.physical_capacity,
        effective_capacity=capacity.effective_capacity,
        limiting_constraint=capacity.limiting_constraint,
        constraints=[
            CapacityConstraintResponse(
                name=cc.name,
                available=cc.available,
                is_limiting=cc.is_limiting,
            )
            for cc in capacity.constraints
        ],
        explanation=capacity.explanation,
    )


# =============================================================================
# Core Intelligence - Route Feasibility
# =============================================================================

@router.get(
    "/intelligence/route/feasibility",
    response_model=RouteFeasibilityListResponse,
    tags=["Intelligence"],
    summary="Check route feasibility from all habitations to all sites",
    description="Returns feasible/infeasible for each habitation-site pair with distance and reason.",
)
async def get_all_route_feasibility():
    """Check feasibility for all habitation-site combinations."""
    habitations = get_habitations()
    sites = get_sites()

    all_routes = []

    for hab in habitations:
        for site in sites:
            result = check_route_feasibility(
                hab.id,
                site.id,
            )

            all_routes.append(
                RouteFeasibilityResponse(
                    habitation_id=result.habitation_id,
                    site_id=result.site_id,
                    feasible=result.feasible,
                    distance_km=result.distance_km,
                    travel_time_min=result.travel_time_min,
                    reason=result.reason,
                    route_used=result.route_used,
                    bottlenecks=result.bottlenecks,
                )
            )

    feasible_count = sum(
        1
        for r in all_routes
        if r.feasible
    )

    infeasible_count = len(all_routes) - feasible_count

    return RouteFeasibilityListResponse(
        routes=all_routes,
        total=len(all_routes),
        feasible_count=feasible_count,
        infeasible_count=infeasible_count,
    )


@router.get(
    "/intelligence/route/feasibility/habitation/{habitation_id}",
    response_model=RouteFeasibilityListResponse,
    tags=["Intelligence"],
    summary="Check route feasibility from one habitation to all sites",
)
async def get_routes_from_habitation(habitation_id: str):
    """Check feasibility from a habitation to all sites."""
    habitation = get_habitation_by_id(habitation_id)

    if not habitation:
        raise HTTPException(
            status_code=404,
            detail=f"Habitation {habitation_id} not found",
        )

    results = check_all_routes_from_habitation(
        habitation_id
    )

    response_routes = [
        RouteFeasibilityResponse(
            habitation_id=r.habitation_id,
            site_id=r.site_id,
            feasible=r.feasible,
            distance_km=r.distance_km,
            travel_time_min=r.travel_time_min,
            reason=r.reason,
            route_used=r.route_used,
            bottlenecks=r.bottlenecks,
        )
        for r in results
    ]

    feasible_count = sum(
        1
        for r in response_routes
        if r.feasible
    )

    infeasible_count = len(response_routes) - feasible_count

    return RouteFeasibilityListResponse(
        routes=response_routes,
        total=len(response_routes),
        feasible_count=feasible_count,
        infeasible_count=infeasible_count,
    )


@router.get(
    "/intelligence/route/feasibility/site/{site_id}",
    response_model=RouteFeasibilityListResponse,
    tags=["Intelligence"],
    summary="Check route feasibility from all habitations to one site",
)
async def get_routes_to_site(site_id: str):
    """Check feasibility from all habitations to a site."""
    site = get_site_by_id(site_id)

    if not site:
        raise HTTPException(
            status_code=404,
            detail=f"Site {site_id} not found",
        )

    results = check_all_routes_for_site(site_id)

    response_routes = [
        RouteFeasibilityResponse(
            habitation_id=r.habitation_id,
            site_id=r.site_id,
            feasible=r.feasible,
            distance_km=r.distance_km,
            travel_time_min=r.travel_time_min,
            reason=r.reason,
            route_used=r.route_used,
            bottlenecks=r.bottlenecks,
        )
        for r in results
    ]

    feasible_count = sum(
        1
        for r in response_routes
        if r.feasible
    )

    infeasible_count = len(response_routes) - feasible_count

    return RouteFeasibilityListResponse(
        routes=response_routes,
        total=len(response_routes),
        feasible_count=feasible_count,
        infeasible_count=infeasible_count,
    )


# =============================================================================
# Relocation Optimization
# =============================================================================

@router.post(
    "/optimization/relocation",
    response_model=RelocationOptimizationResponse,
    tags=["Optimization"],
    summary="Run relocation optimization",
    description=(
        "Generates feasible relocation assignments for vulnerable habitations "
        "to relocation sites using CP-SAT solver. Returns INFEASIBLE with "
        "bottleneck reasons when full relocation is impossible."
    ),
)
async def run_optimization(
    habitation_ids: Optional[List[str]] = Query(
        None,
        description="Specific habitation IDs to optimize (default: all accessible)",
    ),
    site_ids: Optional[List[str]] = Query(
        None,
        description="Specific site IDs to consider (default: all with capacity)",
    ),
    time_limit_seconds: int = Query(
        30,
        ge=5,
        le=300,
        description="Solver time limit in seconds",
    ),
):
    """
    Run relocation optimization for given habitations and sites.
  
    Returns:
    - assignments: habitation, assigned site, population, priority, route status
    - site_remaining_capacity, total_assigned, total_unmet
    - INFEASIBLE status with machine-readable reason when not all population can be assigned
    """
    result = run_relocation_optimization(
        habitation_ids=habitation_ids,
        site_ids=site_ids,
        time_limit_seconds=time_limit_seconds,
    )
    return result


# =============================================================================
# Dynamic Events & Plan Versioning
# =============================================================================

@router.post(
    "/events/trigger",
    response_model=EventTriggerResponse,
    tags=["Events"],
    summary="Trigger a disaster event",
    description=(
        "Triggers a disaster event (bridge_collapse or capacity_reduction) "
        "which may invalidate the active relocation plan and trigger re-optimization."
    ),
)
async def trigger_event(event: DisasterEvent):
    """
    Trigger a disaster event and handle plan invalidation/re-optimization.
    
    Returns:
    - event details
    - whether plan was invalidated
    - previous plan info (if invalidated)
    - new plan info (if re-optimized)
    """
    result = event_service.trigger_event(event)
    
    # Flatten the event data for the response schema
    event_data = result["event"]
    return EventTriggerResponse(
        event_id=event_data["event_id"],
        event_type=event_data["event_type"],
        timestamp=event_data["timestamp"],
        plan_invalidated=result["plan_invalidated"],
        previous_plan=result["previous_plan"],
        new_plan=result["new_plan"],
        message=result.get("message"),
    )


@router.get(
    "/events",
    response_model=EventLogResponse,
    tags=["Events"],
    summary="Get event log",
    description="Returns the log of all triggered disaster events.",
)
async def get_event_log():
    """Get the log of all triggered disaster events."""
    events = [
        EventLogEntry(**e) for e in event_service._event_log
    ]
    return EventLogResponse(events=events, total=len(events))


@router.get(
    "/plan/active",
    response_model=ActivePlanResponse,
    tags=["Plan"],
    summary="Get active relocation plan",
    description="Returns the current active relocation plan and all plan versions.",
)
async def get_active_plan():
    """Get the active relocation plan and version history."""
    active = event_service.get_active_plan()
    all_plans = event_service.get_all_plans()
    
    active_response = None
    if active:
        result = active.optimization_result
        active_response = PlanVersionResponse(
            version=active.version,
            plan_id=active.plan_id,
            status=active.status,
            total_assigned_population=result.total_assigned_population,
            total_unmet_population=result.total_unmet_population,
            optimization_status=result.status,
            created_at=active.created_at,
            invalidated_at=active.invalidated_at,
            invalidation_reason=active.invalidation_reason,
            affected_assignments=active.affected_assignments,
            affected_sites=active.affected_sites,
            affected_routes=active.affected_routes,
        )
    
    all_responses = []
    for p in all_plans:
        result = p.optimization_result
        all_responses.append(PlanVersionResponse(
            version=p.version,
            plan_id=p.plan_id,
            status=p.status,
            total_assigned_population=result.total_assigned_population,
            total_unmet_population=result.total_unmet_population,
            optimization_status=result.status,
            created_at=p.created_at,
            invalidated_at=p.invalidated_at,
            invalidation_reason=p.invalidation_reason,
            affected_assignments=p.affected_assignments,
            affected_sites=p.affected_sites,
            affected_routes=p.affected_routes,
        ))
    
    return ActivePlanResponse(plan=active_response, all_versions=all_responses)


# =============================================================================
# Plan Approval & SMS Dispatch
# =============================================================================

@router.post(
    "/plan/approve",
    response_model=PlanApprovalResponse,
    tags=["Plan"],
    summary="Approve active plan and trigger SMS dispatch",
    description="Human authority approves the relocation plan, triggering mock SMS notifications.",
)
async def approve_plan(request: PlanApprovalRequest):
    """
    Approve a relocation plan and trigger SMS dispatch.

    This is the ONLY authorized path for SMS dispatch per SIH requirements.
    Flow: EVENT/RISK -> RISK ASSESSMENT -> PLAN GENERATION -> HUMAN APPROVAL -> SMS DISPATCH
    """
    result = event_service.plan_approved(request.plan_id)

    if not result.get("success"):
        return PlanApprovalResponse(
            success=False,
            error=result.get("error", "Unknown error"),
        )

    return PlanApprovalResponse(
        success=True,
        plan_id=result["plan_id"],
        plan_version=result["plan_version"],
        sms_notification=result["sms_notification"],
        evacuation_orders_sent=result["evacuation_orders_sent"],
    )


@router.get(
    "/notifications/sms-log",
    response_model=SMSLogResponse,
    tags=["Notifications"],
    summary="Get SMS dispatch log",
    description="Returns the log of all mock SMS dispatches.",
)
async def get_sms_log(plan_id: Optional[str] = None, limit: int = 100):
    """Get SMS dispatch log, optionally filtered by plan."""
    sms_service = get_sms_service()
    entries = sms_service.get_log(plan_id=plan_id, limit=limit)
    # Convert dataclass instances to dicts for Pydantic validation
    entry_dicts = [entry.__dict__ if hasattr(entry, '__dict__') else entry for entry in entries]
    return SMSLogResponse(entries=entry_dicts, total=len(entry_dicts))