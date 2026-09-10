"""
Core disaster intelligence for Aapda Setu (Prototype).

Deterministic calculations for:
1. Risk / Red-Zone scoring
2. Effective Capacity for relocation sites
3. Route Feasibility (habitation -> site)

Uses synthetic/demo data only - NOT official government data.
"""

from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache

from app.services.data_layer import (
    get_habitations,
    get_sites,
    get_routes,
    get_hazards,
    get_infrastructure,
    get_habitation_by_id,
    get_site_by_id,
    get_route_by_id,
    HabitationResponse,
    SiteResponse,
    RouteResponse,
    HazardResponse,
    InfrastructureResponse,
)

from app.schemas.domain import (
    RiskLevel,
    RiskFactors,
    RiskAssessmentResponse,
    EffectiveCapacityResponse,
    CapacityConstraintResponse,
    RouteFeasibilityResponse,
    FloodRiskLevel,
)


# =============================================================================
# Risk / Red-Zone
# =============================================================================

# Severity weights for hazard exposure
SEVERITY_WEIGHTS = {
    "low": 0.2,
    "medium": 0.5,
    "high": 0.8,
    "extreme": 1.0,
}

# Risk level thresholds
RISK_THRESHOLDS = {
    RiskLevel.LOW: 0.3,
    RiskLevel.MEDIUM: 0.5,
    RiskLevel.HIGH: 0.7,
    RiskLevel.RED_ZONE: 0.85,
}


def _calculate_hazard_exposure(habitation: HabitationResponse) -> Tuple[float, float, float]:
    """Calculate flood, erosion, storm surge exposure from hazard_exposure list."""
    flood = 0.0
    erosion = 0.0
    storm_surge = 0.0
    
    for hazard in habitation.hazard_exposure:
        htype = hazard.get("hazard_type", "").lower()
        severity = hazard.get("severity", "low").lower()
        weight = SEVERITY_WEIGHTS.get(severity, 0.2)
        
        if htype == "flood":
            flood = max(flood, weight)
        elif htype == "erosion":
            erosion = max(erosion, weight)
        elif htype == "storm_surge":
            storm_surge = max(storm_surge, weight)
    
    return flood, erosion, storm_surge


def _calculate_population_factor(population: int) -> float:
    """Population factor: larger populations = higher risk (normalized)."""
    return min(1.0, population / 5000.0)


def _calculate_accessibility_factor(is_accessible: bool) -> float:
    """Accessibility factor: inaccessible = higher risk."""
    return 0.0 if is_accessible else 0.3


def classify_risk_level(score: float) -> str:
    """Classify risk score into level."""
    if score >= RISK_THRESHOLDS[RiskLevel.RED_ZONE]:
        return RiskLevel.RED_ZONE
    elif score >= RISK_THRESHOLDS[RiskLevel.HIGH]:
        return RiskLevel.HIGH
    elif score >= RISK_THRESHOLDS[RiskLevel.MEDIUM]:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.LOW


def calculate_risk_score(habitation: HabitationResponse) -> RiskAssessmentResponse:
    """
    Calculate deterministic risk score for a habitation.
    
    Formula (weighted sum):
    - vulnerability_score: 35%
    - max hazard exposure (flood/erosion/storm_surge): 25%
    - population factor: 15%
    - accessibility factor: 10%
    - priority_rank normalization: 15% (higher priority = higher risk)
    """
    # Hazard exposure
    flood_exp, erosion_exp, storm_exp = _calculate_hazard_exposure(habitation)
    max_hazard_exposure = max(flood_exp, erosion_exp, storm_exp)
    
    # Population factor
    pop_factor = _calculate_population_factor(habitation.population)
    
    # Accessibility factor
    access_factor = _calculate_accessibility_factor(habitation.is_accessible)
    
    # Priority factor (normalize: rank 1 = highest risk = 1.0)
    priority_factor = 0.0
    if habitation.priority_rank:
        priority_factor = max(0.0, 1.0 - (habitation.priority_rank - 1) / 12.0)
    
    # Weighted score
    total_score = (
        habitation.vulnerability_score * 0.35 +
        max_hazard_exposure * 0.25 +
        pop_factor * 0.15 +
        access_factor * 0.10 +
        priority_factor * 0.15
    )
    
    # Clamp
    total_score = min(1.0, max(0.0, total_score))
    risk_level = classify_risk_level(total_score)
    
    # Build Pydantic factors model
    factors = RiskFactors(
        vulnerability_score=round(habitation.vulnerability_score * 0.35, 3),
        flood_exposure=round(flood_exp * 0.25, 3),
        erosion_exposure=round(erosion_exp * 0.25, 3),
        storm_surge_exposure=round(storm_exp * 0.25, 3),
        population_factor=round(pop_factor * 0.15, 3),
        accessibility_factor=round(access_factor * 0.10, 3),
    )
    
    explanation = (
        f"Risk={risk_level} (score={total_score:.2f}). "
        f"Main factors: vulnerability={habitation.vulnerability_score:.2f} "
        f"({factors.vulnerability_score:.2f}), "
        f"max_hazard={max_hazard_exposure:.2f} ({factors.flood_exposure + factors.erosion_exposure + factors.storm_surge_exposure:.2f}), "
        f"population={habitation.population} ({factors.population_factor:.2f}), "
        f"accessible={habitation.is_accessible} ({factors.accessibility_factor:.2f}), "
        f"priority_rank={habitation.priority_rank} ({factors.population_factor:.2f})"
    )
    
    return RiskAssessmentResponse(
        habitation_id=habitation.id,
        habitation_name=habitation.name,
        total_score=round(total_score, 3),
        risk_level=risk_level,
        factors=factors,
        explanation=explanation,
    )


@lru_cache(maxsize=1)
def get_all_risk_assessments() -> List[RiskAssessmentResponse]:
    """Calculate risk for all habitations."""
    habitations = get_habitations()
    return [calculate_risk_score(h) for h in habitations]


def get_risk_assessment(habitation_id: str) -> Optional[RiskAssessmentResponse]:
    """Get risk assessment for a single habitation."""
    habitation = get_habitation_by_id(habitation_id)
    if not habitation:
        return None
    return calculate_risk_score(habitation)


def get_red_zone_habitations() -> List[RiskAssessmentResponse]:
    """Get all habitations classified as RED_ZONE."""
    return [r for r in get_all_risk_assessments() if r.risk_level == RiskLevel.RED_ZONE]


# =============================================================================
# Effective Capacity
# =============================================================================

# Per-person requirements (simplified for prototype)
PER_PERSON_REQUIREMENTS = {
    "water": 20,      # liters/day
    "sanitation": 1,  # toilet per 20 people
    "health": 1,      # health worker per 500 people
    "food": 1,        # meal capacity per person
    "road": 1,        # access road capacity
    "safety": 1,      # safety margin
}

# Constraint multipliers based on site attributes
CONSTRAINT_MULTIPLIERS = {
    "water": {
        True: 1.0,    # water available
        False: 0.3,   # no water - severely limited
    },
    "sanitation": {
        True: 1.0,    # sanitation ready
        False: 0.2,   # no sanitation - very limited
    },
    "health": {
        True: 1.0,    # health facilities
        False: 0.4,   # no health - limited
    },
    "food": {
        True: 1.0,    # food storage/kitchen
        False: 0.3,   # no food facilities
    },
    "road": {
        True: 1.0,    # road access
        False: 0.1,   # no road - nearly inaccessible
    },
    "safety": {
        "none": 1.0,
        "low": 0.9,
        "medium": 0.6,
        "high": 0.3,
    },
}


def calculate_effective_capacity(site: SiteResponse) -> EffectiveCapacityResponse:
    """
    Calculate effective capacity for a relocation site.
    
    C_effective = min(space, water, sanitation, health, food, road, safety)
    
    Each constraint is calculated from site attributes.
    """
    physical_capacity = site.max_capacity
    
    constraints_list = []
    
    # 1. Space constraint (physical capacity)
    constraints_list.append(CapacityConstraintResponse(
        name="space",
        available=physical_capacity,
        is_limiting=False,
    ))
    
    # 2. Water constraint
    water_mult = CONSTRAINT_MULTIPLIERS["water"][site.water_available]
    water_cap = int(physical_capacity * water_mult)
    constraints_list.append(CapacityConstraintResponse(
        name="water",
        available=water_cap,
        is_limiting=False,
    ))
    
    # 3. Sanitation constraint (based on infrastructure_ready)
    san_mult = CONSTRAINT_MULTIPLIERS["sanitation"][site.infrastructure_ready]
    san_cap = int(physical_capacity * san_mult)
    constraints_list.append(CapacityConstraintResponse(
        name="sanitation",
        available=san_cap,
        is_limiting=False,
    ))
    
    # 4. Health constraint (based on infrastructure_ready)
    health_mult = CONSTRAINT_MULTIPLIERS["health"][site.infrastructure_ready]
    health_cap = int(physical_capacity * health_mult)
    constraints_list.append(CapacityConstraintResponse(
        name="health",
        available=health_cap,
        is_limiting=False,
    ))
    
    # 5. Food constraint (based on infrastructure_ready)
    food_mult = CONSTRAINT_MULTIPLIERS["food"][site.infrastructure_ready]
    food_cap = int(physical_capacity * food_mult)
    constraints_list.append(CapacityConstraintResponse(
        name="food",
        available=food_cap,
        is_limiting=False,
    ))
    
    # 6. Road constraint
    road_mult = CONSTRAINT_MULTIPLIERS["road"][site.road_access]
    road_cap = int(physical_capacity * road_mult)
    constraints_list.append(CapacityConstraintResponse(
        name="road",
        available=road_cap,
        is_limiting=False,
    ))
    
    # 7. Safety constraint (based on flood_risk)
    flood_risk_key = site.flood_risk.lower() if site.flood_risk else "none"
    safety_mult = CONSTRAINT_MULTIPLIERS["safety"].get(flood_risk_key, 0.5)
    safety_cap = int(physical_capacity * safety_mult)
    constraints_list.append(CapacityConstraintResponse(
        name="safety",
        available=safety_cap,
        is_limiting=False,
    ))
    
    # Find minimum (limiting constraint)
    effective_capacity = min(c.available for c in constraints_list)
    limiting = min(constraints_list, key=lambda c: c.available)
    limiting.is_limiting = True
    
    # Build explanation
    constraint_strs = [f"{c.name}={c.available}" for c in constraints_list]
    explanation = (
        f"Effective capacity={effective_capacity} (physical={physical_capacity}). "
        f"Limiting: {limiting.name}={limiting.available}. "
        f"All constraints: {', '.join(constraint_strs)}"
    )
    
    return EffectiveCapacityResponse(
        site_id=site.id,
        site_name=site.name,
        physical_capacity=physical_capacity,
        effective_capacity=effective_capacity,
        limiting_constraint=limiting.name,
        constraints=constraints_list,
        explanation=explanation,
    )


@lru_cache(maxsize=1)
def get_all_effective_capacities() -> List[EffectiveCapacityResponse]:
    """Calculate effective capacity for all sites."""
    sites = get_sites()
    return [calculate_effective_capacity(s) for s in sites]


def get_effective_capacity(site_id: str) -> Optional[EffectiveCapacityResponse]:
    """Get effective capacity for a single site."""
    site = get_site_by_id(site_id)
    if not site:
        return None
    return calculate_effective_capacity(site)


# =============================================================================
# Route Feasibility
# =============================================================================

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km (haversine formula)."""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371.0  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def _get_coords_from_geometry(geometry: Optional[Dict[str, Any]]) -> Optional[Tuple[float, float]]:
    """Extract (lat, lon) from GeoJSON geometry."""
    if not geometry or geometry.get("type") != "Point":
        return None
    coords = geometry.get("coordinates", [])
    if len(coords) >= 2:
        return (coords[1], coords[0])  # GeoJSON is [lon, lat]
    return None


def check_route_feasibility(habitation_id: str, site_id: str) -> RouteFeasibilityResponse:
    """
    Check if a route from habitation to site is feasible.
    
    Simple deterministic logic:
    1. Find direct route if exists (matching route_id from habitation)
    2. Otherwise calculate straight-line distance
    3. Check if route is open and has no critical bottlenecks
    4. Max distance threshold: 50km
    """
    habitation = get_habitation_by_id(habitation_id)
    site = get_site_by_id(site_id)
    
    if not habitation:
        return RouteFeasibilityResponse(
            habitation_id=habitation_id,
            site_id=site_id,
            feasible=False,
            distance_km=None,
            travel_time_min=None,
            reason=f"Habitation {habitation_id} not found",
        )
    
    if not site:
        return RouteFeasibilityResponse(
            habitation_id=habitation_id,
            site_id=site_id,
            feasible=False,
            distance_km=None,
            travel_time_min=None,
            reason=f"Site {site_id} not found",
        )
    
    # Check if habitation has evacuation route
    route_id = habitation.evacuation_route_id
    route = None
    if route_id:
        route = get_route_by_id(route_id)
    
    # Calculate straight-line distance as fallback
    hab_coords = _get_coords_from_geometry(habitation.geometry)
    site_coords = _get_coords_from_geometry(site.geometry)
    
    straight_distance = None
    if hab_coords and site_coords:
        straight_distance = _haversine_km(hab_coords[0], hab_coords[1], site_coords[0], site_coords[1])
    
    # Determine feasibility
    MAX_DISTANCE_KM = 50.0
    
    if route:
        # Use existing route data
        distance = route.length_km
        travel_time = route.travel_time_min
        bottlenecks = route.bridge_dependencies or []
        
        if route.status != "open":
            return RouteFeasibilityResponse(
                habitation_id=habitation_id,
                site_id=site_id,
                feasible=False,
                distance_km=distance,
                travel_time_min=travel_time,
                reason=f"Route {route_id} status: {route.status}",
                route_used=route_id,
                bottlenecks=bottlenecks,
            )
        
        if distance > MAX_DISTANCE_KM:
            return RouteFeasibilityResponse(
                habitation_id=habitation_id,
                site_id=site_id,
                feasible=False,
                distance_km=distance,
                travel_time_min=travel_time,
                reason=f"Route distance {distance:.1f}km exceeds max {MAX_DISTANCE_KM}km",
                route_used=route_id,
                bottlenecks=bottlenecks,
            )
        
        # Check for collapsed bridges in dependencies
        infrastructure = get_infrastructure()
        bridge_status = {i.id: i.condition for i in infrastructure if i.infra_type == "bridge"}
        collapsed_bridges = [b for b in bottlenecks if bridge_status.get(b) == "collapsed"]
        
        if collapsed_bridges:
            return RouteFeasibilityResponse(
                habitation_id=habitation_id,
                site_id=site_id,
                feasible=False,
                distance_km=distance,
                travel_time_min=travel_time,
                reason=f"Collapsed bridges on route: {', '.join(collapsed_bridges)}",
                route_used=route_id,
                bottlenecks=bottlenecks,
            )
        
        return RouteFeasibilityResponse(
            habitation_id=habitation_id,
            site_id=site_id,
            feasible=True,
            distance_km=distance,
            travel_time_min=travel_time,
            reason=f"Route {route_id} is open and within distance limit",
            route_used=route_id,
            bottlenecks=bottlenecks,
        )
    
    # Fallback: straight-line distance
    if straight_distance is not None:
        if straight_distance > MAX_DISTANCE_KM:
            return RouteFeasibilityResponse(
                habitation_id=habitation_id,
                site_id=site_id,
                feasible=False,
                distance_km=round(straight_distance, 1),
                travel_time_min=None,
                reason=f"Straight-line distance {straight_distance:.1f}km exceeds max {MAX_DISTANCE_KM}km",
            )
        
        # Estimate travel time (assume 40 km/h average)
        est_time = round(straight_distance / 40.0 * 60, 1)
        
        return RouteFeasibilityResponse(
            habitation_id=habitation_id,
            site_id=site_id,
            feasible=True,
            distance_km=round(straight_distance, 1),
            travel_time_min=est_time,
            reason=f"Direct path feasible (estimated {straight_distance:.1f}km, {est_time}min)",
        )
    
    return RouteFeasibilityResponse(
        habitation_id=habitation_id,
        site_id=site_id,
        feasible=False,
        distance_km=None,
        travel_time_min=None,
        reason="Cannot determine route - missing geometry data",
    )


def check_all_routes_for_site(site_id: str) -> List[RouteFeasibilityResponse]:
    """Check feasibility from all habitations to a specific site."""
    habitations = get_habitations()
    return [check_route_feasibility(h.id, site_id) for h in habitations]


def check_all_routes_from_habitation(habitation_id: str) -> List[RouteFeasibilityResponse]:
    """Check feasibility from a habitation to all sites."""
    sites = get_sites()
    return [check_route_feasibility(habitation_id, s.id) for s in sites]