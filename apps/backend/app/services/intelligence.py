"""
Core disaster intelligence for Aapda Setu (Prototype).

Deterministic calculations for:
1. Risk / Red-Zone scoring
2. Effective Capacity for relocation sites
3. Route Feasibility (habitation -> site)

Uses synthetic/demo data only - NOT official government data.
"""

from typing import List, Dict, Any, Optional, Tuple, NamedTuple
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

from app.services.gis_engine import (
    distance_km,
    lnglat_to_point,
    build_road_network,
    RoadNetworkGraph,
    assess_route_feasibility,
    haversine_km,
    Point,
)

from app.schemas.domain import (
    RiskLevel,
    RiskFactors,
    RiskAssessmentResponse,
    EffectiveCapacityResponse,
    CapacityConstraintResponse,
    RouteFeasibilityResponse,
    FloodRiskLevel,
    RouteStatus,
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

# Module-level road network graph (built once)
_road_network: Optional[RoadNetworkGraph] = None


def _get_road_network() -> RoadNetworkGraph:
    """Get or build the road network graph."""
    global _road_network
    if _road_network is None:
        roads = get_routes()  # Using evacuation routes as road network
        _road_network = build_road_network([
            {
                "id": r.id,
                "geometry": r.geometry,
                "properties": {
                    "road_type": r.route_type,
                    "name": r.name,
                }
            }
            for r in roads
            if r.geometry and r.geometry.get("type") == "LineString"
        ])
    return _road_network


def _get_coords_from_geometry(geometry: Optional[Dict[str, Any]]) -> Optional[Point]:
    """Extract Shapely Point from GeoJSON geometry (Point or Polygon centroid)."""
    if not geometry:
        return None
    
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates", [])
    
    if geom_type == "Point":
        if len(coords) >= 2:
            return lnglat_to_point(coords[0], coords[1])
    
    elif geom_type == "Polygon":
        if coords and coords[0]:
            ring = coords[0]
            if len(ring) >= 3:
                # Calculate centroid
                lngs = [p[0] for p in ring]
                lats = [p[1] for p in ring]
                centroid_lng = sum(lngs) / len(lngs)
                centroid_lat = sum(lats) / len(lats)
                return lnglat_to_point(centroid_lng, centroid_lat)
    
    elif geom_type == "MultiPolygon":
        if coords and coords[0] and coords[0][0]:
            ring = coords[0][0]
            if len(ring) >= 3:
                lngs = [p[0] for p in ring]
                lats = [p[1] for p in ring]
                centroid_lng = sum(lngs) / len(lngs)
                centroid_lat = sum(lats) / len(lats)
                return lnglat_to_point(centroid_lng, centroid_lat)
    
    return None


def check_route_feasibility(habitation_id: str, site_id: str) -> RouteFeasibilityResponse:
    """
    Check if a route from habitation to site is feasible.
    
    Uses road network graph for accurate distance/travel time calculation.
    Falls back to straight-line distance if network unavailable.
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
    
    # Get coordinates as Shapely Points
    hab_point = _get_coords_from_geometry(habitation.geometry)
    site_point = _get_coords_from_geometry(site.geometry)
    
    # Calculate straight-line distance as fallback
    straight_distance = None
    if hab_point and site_point:
        straight_distance = distance_km(hab_point, site_point)
    
    # Try to use road network for accurate routing
    network_distance = None
    network_time = None
    network_geometry = None
    
    try:
        network = _get_road_network()
        if hab_point and site_point:
            path = network.shortest_path(hab_point, site_point, weight="travel_time")
            if path:
                network_distance = path["distance_km"]
                network_time = path["travel_time_min"]
                network_geometry = path["geometry"]
    except Exception:
        pass  # Fall back to straight-line or route data
    
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
    
    # Use network distance if available, otherwise straight-line
    if network_distance is not None:
        distance = network_distance
        travel_time = network_time
        reason_suffix = "via road network"
    elif straight_distance is not None:
        distance = straight_distance
        travel_time = round(straight_distance / 40.0 * 60, 1) if straight_distance else None
        reason_suffix = "via direct path (estimated)"
    else:
        distance = None
        travel_time = None
        reason_suffix = "unknown distance"
    
    if distance is not None and distance > MAX_DISTANCE_KM:
        return RouteFeasibilityResponse(
            habitation_id=habitation_id,
            site_id=site_id,
            feasible=False,
            distance_km=round(distance, 1),
            travel_time_min=travel_time,
            reason=f"Distance {distance:.1f}km exceeds max {MAX_DISTANCE_KM}km ({reason_suffix})",
        )
    
    if distance is not None:
        return RouteFeasibilityResponse(
            habitation_id=habitation_id,
            site_id=site_id,
            feasible=True,
            distance_km=round(distance, 1),
            travel_time_min=travel_time,
            reason=f"Direct path feasible ({distance:.1f}km, {travel_time}min {reason_suffix})",
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


# =============================================================================
# Route Candidates (for multi-route selection UI)
# =============================================================================

class RouteCandidate(NamedTuple):
    """A candidate evacuation route from habitation to site."""
    route_id: str
    route_name: str
    route_type: str
    site_id: str
    site_name: str
    distance_km: float
    travel_time_min: float
    status: RouteStatus
    capacity_per_hour: int
    geometry: Optional[Dict[str, Any]]
    rank_score: float
    is_recommended: bool = False


def get_route_candidates(habitation_id: str) -> List[Dict[str, Any]]:
    """
    Get all geographically reachable routes from a habitation to any open site.
    
    Returns routes ranked by a combination of:
    - distance (shorter is better)
    - travel_time_min (shorter is better)  
    - route status (open > congested > impassable)
    - route_type (primary > alternative > contingency)
    
    Includes:
    1. The habitation's designated evacuation route (if open)
    2. All open routes whose start is near the habitation (within 5km)
    3. For each route, pairs with the closest open site to the route's end point
    """
    habitation = get_habitation_by_id(habitation_id)
    if not habitation:
        return []
    
    sites = get_sites()
    routes = get_routes()
    
    # Get open sites only
    open_sites = [s for s in sites if s.available_capacity > 0]
    if not open_sites:
        return []
    
    hab_point = _get_coords_from_geometry(habitation.geometry)
    if not hab_point:
        return []
    
    hab_lat = hab_point.y
    hab_lng = hab_point.x
    
    candidates = []
    PROXIMITY_THRESHOLD_KM = 10.0
    MAX_DISTANCE_KM = 50.0
    
    # Check infrastructure for collapsed bridges
    infrastructure = get_infrastructure()
    bridge_status = {i.id: i.condition for i in infrastructure if i.infra_type == "bridge"}
    
    # Track best site per route to avoid duplicates
    route_best_site = {}
    
    for route in routes:
        if route.status != "open":
            continue
        
        # Skip routes with collapsed bridges
        collapsed_bridges = [b for b in route.bridge_dependencies if bridge_status.get(b) == "collapsed"]
        if collapsed_bridges:
            continue
        
        route_coords = route.geometry.get("coordinates", []) if route.geometry else []
        if not route_coords:
            continue
        
        route_start = route_coords[0]
        route_end = route_coords[-1]
        
        # Check if route start is near habitation
        hab_to_route_start = haversine_km(hab_lat, hab_lng, route_start[1], route_start[0])
        
        # Include if:
        # 1. Route start is near habitation (within 5km)
        # 2. OR it's the habitation's designated evacuation route
        is_designated = route.id == habitation.evacuation_route_id
        is_proximate = hab_to_route_start < PROXIMITY_THRESHOLD_KM
        
        if not (is_designated or is_proximate):
            continue
        
        # Find the closest site to the route end
        best_site = None
        best_site_dist = float('inf')
        
        for site in open_sites:
            site_point = _get_coords_from_geometry(site.geometry)
            if not site_point:
                continue
            
            site_lat = site_point.y
            site_lng = site_point.x
            
            route_end_to_site = haversine_km(route_end[1], route_end[0], site_lat, site_lng)
            
            if route_end_to_site < best_site_dist:
                best_site_dist = route_end_to_site
                best_site = site
        
        if not best_site:
            continue
        
        route_best_site[route.id] = best_site
    
    # Now build candidates from unique routes
    for route_id, best_site in route_best_site.items():
        route = get_route_by_id(route_id)
        if not route:
            continue
        
        # Check total distance (habitation to site via route)
        site_point = _get_coords_from_geometry(best_site.geometry)
        if not site_point:
            continue
            
        site_lat = site_point.y
        site_lng = site_point.x
        
        straight_distance = haversine_km(hab_lat, hab_lng, site_lat, site_lng)
        
        if straight_distance > MAX_DISTANCE_KM:
            continue
        
        # Calculate rank score (lower is better)
        distance_score = route.length_km / 50.0  # normalize to 0-1
        time_score = route.travel_time_min / 60.0  # normalize
        
        # Status penalty
        status_score = 0.0 if route.status == "open" else (0.3 if route.status == "congested" else 1.0)
        
        # Route type preference
        type_score = {"primary": 0.0, "alternative": 0.1, "contingency": 0.2}.get(route.route_type, 0.2)
        
        # Proximity bonus for designated route
        designated_bonus = -0.1 if route.id == habitation.evacuation_route_id else 0.0
        
        rank_score = distance_score * 0.4 + time_score * 0.3 + status_score * 0.2 + type_score * 0.1 + designated_bonus
        
        candidates.append({
            "route_id": route.id,
            "route_name": route.name,
            "route_type": route.route_type,
            "site_id": best_site.id,
            "site_name": best_site.name,
            "distance_km": round(route.length_km, 1),
            "travel_time_min": round(route.travel_time_min, 1),
            "status": route.status,
            "capacity_per_hour": route.capacity_per_hour,
            "geometry": route.geometry,
            "rank_score": round(rank_score, 3),
            "is_recommended": False,  # Will be set after sorting
        })
    
    # Sort by rank score (best first)
    candidates.sort(key=lambda c: c["rank_score"])
    
    # Mark best as recommended
    if candidates:
        candidates[0]["is_recommended"] = True
    
    return candidates