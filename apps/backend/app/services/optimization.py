"""
Relocation Optimization Service for Aapda Setu.

Connects the data layer with the OR-Tools CP-SAT optimizer to generate
feasible relocation assignments for vulnerable habitations.

Prototype principles:
- Use effective capacity, not raw physical capacity.
- Keep habitation assignments whole.
- Respect route feasibility.
- Prefer higher-priority habitations at the API/result level.
- Return partial plans when full relocation is impossible.
- Clearly explain capacity, route, and packing bottlenecks.
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import time

from app.services.data_layer import (
    get_habitations,
    get_sites,
    get_routes,
    get_shelters,
    get_route_by_id,
    HabitationResponse,
    SiteResponse,
    RouteResponse,
    ShelterResponse,
)

from app.services.intelligence import (
    check_route_feasibility,
    get_all_effective_capacities,
    get_route_candidates,
)

from optimizer import (
    Habitation as OptHabitation,
    Shelter as OptShelter,
    Route as OptRoute,
    OptimizationConstraints as OptConstraints,
    OptimizationObjectives as OptObjectives,
    OptimizationResult as OptResult,
    create_optimizer,
)

from app.schemas.domain import (
    OptimizationStatus,
    InfeasibilityReason,
    SiteCapacitySummary,
)


# =============================================================================
# RESPONSE MODELS
# =============================================================================


@dataclass
class RelocationAssignment:
    """Single habitation-to-site assignment result."""

    habitation_id: str
    habitation_name: str
    assigned_site_id: str
    assigned_site_name: str
    population: int
    priority_rank: Optional[int]
    route_status: str
    route_id: Optional[str]
    distance_km: Optional[float]
    travel_time_min: Optional[float]
    site_remaining_capacity: int


@dataclass
class OptimizationResponse:
    """Complete relocation optimization response."""

    status: OptimizationStatus
    assignments: List[RelocationAssignment]
    total_assigned_population: int
    total_unmet_population: int
    site_capacities: Dict[str, Any]
    infeasibility_reasons: List[InfeasibilityReason]
    computation_time_ms: float
    solver_stats: Dict[str, Any]


# =============================================================================
# HELPERS
# =============================================================================


def _extract_coords(
    geometry: Optional[Dict[str, Any]],
) -> Tuple[float, float]:
    """Extract longitude and latitude from GeoJSON Point geometry."""

    if not geometry:
        return (0.0, 0.0)

    if geometry.get("type") != "Point":
        return (0.0, 0.0)

    coords = geometry.get("coordinates", [])

    if len(coords) >= 2:
        try:
            return (
                float(coords[0]),
                float(coords[1]),
            )
        except (TypeError, ValueError):
            return (0.0, 0.0)

    return (0.0, 0.0)


def _effective_capacity_map() -> Dict[str, int]:
    """
    Return effective capacity by relocation-site ID.

    Effective capacity is the usable capacity after applying:
    space, water, sanitation, health, food, road and safety constraints.
    """

    capacities = get_all_effective_capacities()

    return {
        capacity.site_id: max(
            0,
            int(capacity.effective_capacity),
        )
        for capacity in capacities
    }


def _available_effective_capacity(
    site: SiteResponse,
    effective_capacity_map: Dict[str, int],
) -> int:
    """
    Calculate remaining usable capacity.

    The intelligence layer calculates effective capacity.
    Existing current allocation is subtracted exactly once here.
    """

    effective_capacity = effective_capacity_map.get(
        site.id,
        max(0, int(site.max_capacity)),
    )

    current_allocation = max(
        0,
        int(site.current_allocation),
    )

    return max(
        0,
        effective_capacity - current_allocation,
    )


def _route_status(route: RouteResponse) -> str:
    """Return route status as a plain string."""

    if hasattr(route.status, "value"):
        return str(route.status.value)

    return str(route.status)


# =============================================================================
# OPTIMIZER INPUT BUILDERS
# =============================================================================


def _build_optimizer_habitations(
    habitations: List[HabitationResponse],
    sites: Optional[List[SiteResponse]] = None,
) -> List[OptHabitation]:
    """
    Convert data-layer habitations into optimizer objects.

    A habitation remains indivisible:
    its complete population is assigned to one site or remains unmet.

    NOTE:
    priority_rank exists in the API/data model but is NOT passed to
    OptHabitation because the restored optimizer model does not accept it.
    """

    if sites is None:
        sites = get_sites()

    site_ids = [
        site.id
        for site in sites
    ]

    all_routes = get_routes()

    open_route_ids = [
        route.id
        for route in all_routes
        if _route_status(route) == "open"
    ]

    optimizer_habitations = []

    for habitation in habitations:
        accessible_routes: List[str] = []

        # -------------------------------------------------------------
        # Primary evacuation route
        # -------------------------------------------------------------

        if habitation.evacuation_route_id:
            route = get_route_by_id(
                habitation.evacuation_route_id
            )

            if route and _route_status(route) == "open":
                accessible_routes.append(route.id)

        # -------------------------------------------------------------
        # Prototype fallback
        # -------------------------------------------------------------
        # The synthetic dataset does not contain a complete
        # habitation-to-route graph. Therefore all currently open
        # routes are available as alternatives to the optimizer.
        # Final route feasibility is additionally checked by the
        # intelligence layer.

        for route_id in open_route_ids:
            if route_id not in accessible_routes:
                accessible_routes.append(route_id)

        # -------------------------------------------------------------
        # Candidate relocation sites
        # -------------------------------------------------------------

        nearest_shelter_ids = list(site_ids)

        if habitation.nearest_shelter_id:
            if habitation.nearest_shelter_id not in nearest_shelter_ids:
                nearest_shelter_ids.append(
                    habitation.nearest_shelter_id
                )

        # -------------------------------------------------------------
        # Build optimizer habitation
        # -------------------------------------------------------------

        optimizer_habitations.append(
            OptHabitation(
                id=habitation.id,
                population=int(habitation.population),
                vulnerability_score=float(
                    habitation.vulnerability_score
                ),
                location=_extract_coords(
                    habitation.geometry
                ),
                nearest_shelter_ids=nearest_shelter_ids,
                accessible_route_ids=accessible_routes,
            )
        )

    return optimizer_habitations


def _build_optimizer_shelters(
    shelters: List[ShelterResponse],
) -> List[OptShelter]:
    """Convert normal shelter records to optimizer shelter objects."""

    optimizer_shelters = []

    for shelter in shelters:
        optimizer_shelters.append(
            OptShelter(
                id=shelter.id,
                nominal_capacity=int(
                    shelter.capacity
                ),
                effective_capacity=int(
                    shelter.effective_capacity
                ),
                current_occupancy=int(
                    shelter.current_occupancy
                ),
                location=_extract_coords(
                    shelter.geometry
                ),
                shelter_type=(
                    shelter.shelter_type.value
                    if hasattr(
                        shelter.shelter_type,
                        "value",
                    )
                    else str(shelter.shelter_type)
                ),
                is_active=bool(
                    shelter.is_active
                ),
            )
        )

    return optimizer_shelters


def _build_optimizer_shelters_from_sites(
    sites: List[SiteResponse],
) -> List[OptShelter]:
    """
    Convert relocation sites into optimizer shelter objects.

    IMPORTANT:
    The optimizer receives remaining EFFECTIVE capacity.

    Physical capacity such as 19,500 must never become the
    optimization capacity when effective capacity is only 12,410.
    """

    effective_capacity_map = _effective_capacity_map()

    optimizer_shelters = []

    for site in sites:

        available_effective = _available_effective_capacity(
            site,
            effective_capacity_map,
        )

        optimizer_shelters.append(
            OptShelter(
                id=site.id,

                # Physical capacity retained only as reference.
                nominal_capacity=int(
                    site.max_capacity
                ),

                # Actual capacity available to optimizer.
                effective_capacity=available_effective,

                # Already deducted above.
                current_occupancy=0,

                location=_extract_coords(
                    site.geometry
                ),

                shelter_type="relocation_site",

                is_active=(
                    available_effective > 0
                ),
            )
        )

    return optimizer_shelters


def _build_optimizer_routes(
    routes: List[RouteResponse],
) -> List[OptRoute]:
    """Convert route records into optimizer route objects."""

    optimizer_routes = []

    for route in routes:

        optimizer_routes.append(
            OptRoute(
                id=route.id,
                habitation_ids=[],
                shelter_ids=[],
                length_km=float(
                    route.length_km
                ),
                travel_time_min=float(
                    route.travel_time_min
                ),
                capacity_per_hour=float(
                    route.capacity_per_hour
                ),
                status=_route_status(route),
                bridge_dependencies=(
                    route.bridge_dependencies
                ),
            )
        )

    return optimizer_routes


# =============================================================================
# OPTIMIZATION CONFIGURATION
# =============================================================================


def _build_constraints() -> OptConstraints:
    """Build deterministic prototype optimization constraints."""

    return OptConstraints(
        max_travel_time_min=120.0,
        min_shelter_capacity_buffer=0.0,
        max_relocation_distance_km=50.0,
        bridge_closure_penalty=1000.0,
        capacity_utilization_limit=1.0,
        priority_weights={},
    )


def _build_objectives() -> OptObjectives:
    """
    Build optimization objectives.

    Priority ordering is preserved in the API result using
    habitation priority_rank.
    """

    return OptObjectives(
        minimize_travel_time=1.0,
        maximize_safety=1.0,
        minimize_cost=0.5,
        balance_load=0.3,
    )


def _map_solver_status(
    status: str,
) -> OptimizationStatus:
    """Map optimizer status to API status."""

    mapping = {
        "OPTIMAL": OptimizationStatus.OPTIMAL,
        "FEASIBLE": OptimizationStatus.FEASIBLE,
        "INFEASIBLE": OptimizationStatus.INFEASIBLE,
        "INVALID": OptimizationStatus.UNKNOWN,
        "UNKNOWN": OptimizationStatus.UNKNOWN,
    }

    return mapping.get(
        str(status),
        OptimizationStatus.UNKNOWN,
    )


# =============================================================================
# INFEASIBILITY ANALYSIS
# =============================================================================


def _build_infeasibility_reasons(
    opt_result: OptResult,
    habitations: List[HabitationResponse],
    sites: List[SiteResponse],
) -> List[InfeasibilityReason]:
    """
    Build truthful explanations for unmet population with specific,
    actionable recommendations per constraint.

    Capacity alone is not assumed to be the cause because
    whole-habitation packing and route constraints can also
    prevent assignments.
    """

    reasons: List[InfeasibilityReason] = []

    # -----------------------------------------------------------------
    # Optimizer-provided reasons
    # -----------------------------------------------------------------

    for reason in opt_result.infeasibility_reasons:

        reasons.append(
            InfeasibilityReason(
                constraint=reason.get(
                    "constraint",
                    "unknown",
                ),
                description=reason.get(
                    "description",
                    "",
                ),
                affected_habitations=reason.get(
                    "affected_habitations",
                    [],
                ),
                severity=reason.get(
                    "severity",
                    "critical",
                ),
                recommendation=reason.get(
                    "recommendation",
                    "",
                ),
            )
        )

    unassigned_ids = list(
        opt_result.unassigned_habitations
    )

    if not unassigned_ids:
        return reasons

    habitation_map = {
        habitation.id: habitation
        for habitation in habitations
    }

    # -----------------------------------------------------------------
    # Effective capacity analysis
    # -----------------------------------------------------------------

    effective_capacity_map = _effective_capacity_map()

    total_effective_capacity = sum(
        _available_effective_capacity(
            site,
            effective_capacity_map,
        )
        for site in sites
    )

    total_population = sum(
        int(habitation.population)
        for habitation in habitations
    )

    if total_population > total_effective_capacity:

        shortage = (
            total_population
            - total_effective_capacity
        )

        # Find sites with largest gaps for specific recommendation
        site_gaps = []
        for site in sites:
            available = _available_effective_capacity(site, effective_capacity_map)
            if available > 0:
                site_gaps.append((site.id, site.name, available))
        
        # Sort by available capacity descending
        site_gaps.sort(key=lambda x: x[2], reverse=True)
        
        # Specific recommendation: which site needs how much more
        if site_gaps:
            top_site_id, top_site_name, top_avail = site_gaps[0]
            needed_at_top = min(shortage, max(h.population for h in habitations if h.id in unassigned_ids))
            specific_rec = (
                f"Increase {top_site_name} ({top_site_id}) effective capacity by {needed_at_top} "
                f"(current: {top_avail}) to accommodate largest unassigned habitation, "
                f"or activate additional sites to cover total shortage of {shortage}."
            )
        else:
            specific_rec = (
                f"Activate new relocation sites with at least {shortage} total effective capacity "
                f"to cover the shortfall."
            )

        reasons.append(
            InfeasibilityReason(
                constraint="effective_capacity",
                description=(
                    f"Total selected population "
                    f"({total_population}) exceeds total "
                    f"available effective relocation capacity "
                    f"({total_effective_capacity}) by "
                    f"{shortage}."
                ),
                affected_habitations=unassigned_ids,
                severity="critical",
                recommendation=specific_rec,
            )
        )

    # -----------------------------------------------------------------
    # Whole-habitation packing analysis
    # -----------------------------------------------------------------

    sites_with_capacity = []

    for site in sites:

        available = _available_effective_capacity(
            site,
            effective_capacity_map,
        )

        if available > 0:
            sites_with_capacity.append(
                (
                    site.id,
                    site.name,
                    available,
                )
            )

    packing_blocked = []
    packing_details = []  # (habitation_id, habitation_name, population, max_site_avail)

    for habitation_id in unassigned_ids:

        habitation = habitation_map.get(
            habitation_id
        )

        if not habitation:
            continue

        population = int(
            habitation.population
        )

        max_available = max(
            (available for _, _, available in sites_with_capacity),
            default=0
        )

        can_fit_anywhere = population <= max_available

        if not can_fit_anywhere:
            packing_blocked.append(habitation_id)
            packing_details.append((
                habitation_id,
                habitation.name,
                population,
                max_available
            ))

    if packing_blocked:

        # Build specific recommendations per habitation
        detail_strs = []
        for hab_id, hab_name, pop, max_avail in packing_details:
            needed = pop - max_avail
            detail_strs.append(f"{hab_name} ({hab_id}): needs {pop}, max site has {max_avail} → increase by {needed}")
        
        specific_rec = (
            "Habitations too large for any single site: "
            + "; ".join(detail_strs)
            + ". Increase site capacity or enable habitation splitting."
        )

        reasons.append(
            InfeasibilityReason(
                constraint="whole_habitation_capacity",
                description=(
                    "Some habitations cannot be assigned "
                    "because their complete population does not "
                    "fit within any single site's remaining "
                    "effective capacity. Partial habitation "
                    "splitting is disabled."
                ),
                affected_habitations=packing_blocked,
                severity="critical",
                recommendation=specific_rec,
            )
        )

    # -----------------------------------------------------------------
    # Route feasibility analysis
    # -----------------------------------------------------------------

    route_blocked = []
    route_details = []  # (habitation_id, habitation_name, blocked_routes_info)

    for habitation_id in unassigned_ids:

        habitation = habitation_map.get(
            habitation_id
        )

        if not habitation:
            continue

        has_feasible_route = False
        blocked_for_hab = []

        for site in sites:

            available = _available_effective_capacity(
                site,
                effective_capacity_map,
            )

            if available < int(
                habitation.population
            ):
                continue

            # First check primary route feasibility
            feasibility = check_route_feasibility(
                habitation.id,
                site.id,
            )

            if feasibility.feasible:
                has_feasible_route = True
                break

            # Track why this route failed
            blocked_for_hab.append({
                "site_id": site.id,
                "site_name": site.name,
                "reason": feasibility.reason,
                "route_used": feasibility.route_used,
                "bottlenecks": feasibility.bottlenecks,
            })

            # If primary route fails, check alternative routes via get_route_candidates
            candidates = get_route_candidates(habitation.id)
            alt_found = False
            for candidate in candidates:
                if candidate["site_id"] == site.id and candidate["status"] == "open":
                    alt_found = True
                    has_feasible_route = True
                    break
            
            if alt_found:
                break

        if not has_feasible_route:
            route_blocked.append(habitation_id)
            route_details.append((habitation_id, habitation.name, blocked_for_hab))

    if route_blocked:

        # Build specific recommendations per habitation
        detail_strs = []
        for hab_id, hab_name, blocked_list in route_details:
            if blocked_list:
                # Find the most common bottleneck
                bottlenecks = []
                for b in blocked_list:
                    bottlenecks.extend(b.get("bottlenecks", []))
                from collections import Counter
                bottleneck_counts = Counter(bottlenecks)
                top_bottleneck = bottleneck_counts.most_common(1)[0][0] if bottleneck_counts else "unknown"
                detail_strs.append(f"{hab_name} ({hab_id}): blocked by {top_bottleneck}")
            else:
                detail_strs.append(f"{hab_name} ({hab_id}): no viable route to any site with capacity")
        
        specific_rec = (
            "Route-blocked habitations: "
            + "; ".join(detail_strs)
            + ". Restore bridges, open alternative routes, or use different sites."
        )

        reasons.append(
            InfeasibilityReason(
                constraint="route_feasibility",
                description=(
                    "Some unmet habitations have no feasible "
                    "route to a relocation site with enough "
                    "effective capacity, even after checking "
                    "alternative routes."
                ),
                affected_habitations=route_blocked,
                severity="critical",
                recommendation=specific_rec,
            )
        )

    return reasons


# =============================================================================
# ASSIGNMENT MAPPING
# =============================================================================


def _build_assignments(
    opt_result: OptResult,
    habitations: List[HabitationResponse],
    sites: List[SiteResponse],
) -> List[RelocationAssignment]:
    """Convert optimizer assignments into API response objects."""

    habitation_map = {
        habitation.id: habitation
        for habitation in habitations
    }

    site_map = {
        site.id: site
        for site in sites
    }

    effective_capacity_map = _effective_capacity_map()

    # Calculate site allocation once.
    site_allocated_map: Dict[str, int] = {}

    for habitation_assignments in (
        opt_result.assignments.values()
    ):

        for site_id, population in (
            habitation_assignments.items()
        ):

            site_allocated_map[site_id] = (
                site_allocated_map.get(
                    site_id,
                    0,
                )
                + int(population)
            )

    assignments: List[RelocationAssignment] = []

    for habitation_id, site_assignments in (
        opt_result.assignments.items()
    ):

        habitation = habitation_map.get(
            habitation_id
        )

        if not habitation:
            continue

        for site_id, population_assigned in (
            site_assignments.items()
        ):

            population_assigned = int(
                population_assigned
            )

            if population_assigned <= 0:
                continue

            site = site_map.get(
                site_id
            )

            if not site:
                continue

            feasibility = check_route_feasibility(
                habitation_id,
                site_id,
            )

            route_id = feasibility.route_used
            distance_km = feasibility.distance_km
            travel_time_min = feasibility.travel_time_min
            route_status = "feasible" if feasibility.feasible else "infeasible"

            if not feasibility.feasible:
                candidates = get_route_candidates(habitation_id)
                for candidate in candidates:
                    if candidate.get("site_id") == site_id and candidate.get("status") == "open":
                        route_id = candidate.get("route_id")
                        distance_km = candidate.get("distance_km")
                        travel_time_min = candidate.get("travel_time_min")
                        route_status = "feasible"
                        break

            site_capacity = _available_effective_capacity(
                site,
                effective_capacity_map,
            )

            allocated_population = (
                site_allocated_map.get(
                    site_id,
                    0,
                )
            )

            remaining = max(
                0,
                site_capacity
                - allocated_population,
            )

            assignments.append(
                RelocationAssignment(
                    habitation_id=habitation.id,
                    habitation_name=habitation.name,
                    assigned_site_id=site.id,
                    assigned_site_name=site.name,
                    population=population_assigned,
                    priority_rank=(
                        habitation.priority_rank
                    ),
                    route_status=route_status,
                    route_id=route_id,
                    distance_km=distance_km,
                    travel_time_min=travel_time_min,
                    site_remaining_capacity=remaining,
                )
            )

    # Highest priority first.
    assignments.sort(
        key=lambda assignment: (
            assignment.priority_rank
            if assignment.priority_rank is not None
            else 999
        )
    )

    return assignments


# =============================================================================
# SITE CAPACITY REPORTING
# =============================================================================


def _build_site_capacities(
    opt_result: OptResult,
    sites: List[SiteResponse],
    habitations: List[HabitationResponse],
) -> Dict[str, SiteCapacitySummary]:
    """
    Build site capacity summaries using effective capacity.

    max_capacity represents usable capacity available to the
    relocation optimizer, not raw physical capacity.
    """

    effective_capacity_map = _effective_capacity_map()

    result: Dict[str, SiteCapacitySummary] = {}

    for site in sites:

        effective_capacity = _available_effective_capacity(
            site,
            effective_capacity_map,
        )

        assigned_habitations = [
            habitation_id
            for habitation_id, site_assignments
            in opt_result.assignments.items()
            if (
                site.id in site_assignments
                and site_assignments[site.id] > 0
            )
        ]

        allocated_population = sum(
            int(population)
            for site_assignments
            in opt_result.assignments.values()
            for assigned_site_id, population
            in site_assignments.items()
            if assigned_site_id == site.id
        )

        remaining_capacity = max(
            0,
            effective_capacity
            - allocated_population,
        )

        result[site.id] = SiteCapacitySummary(
            site_id=site.id,
            site_name=site.name,

            # Actual usable capacity.
            max_capacity=effective_capacity,

            # Current allocation has already been deducted
            # from max_capacity.
            current_allocation=0,

            allocated_population=allocated_population,

            remaining_capacity=remaining_capacity,

            assigned_habitations=assigned_habitations,
        )

    return result


# =============================================================================
# GREEDY FALLBACK
# =============================================================================


def _greedy_fallback(
    habitations: List[HabitationResponse],
    sites: List[SiteResponse],
    effective_capacity_map: Dict[str, int],
) -> List[RelocationAssignment]:
    """
    Greedy fallback when CP-SAT fails or times out.

    Assigns habitations by priority order to the nearest feasible site
    with available effective capacity.
    """
    from app.services.intelligence import check_route_feasibility

    habitation_map = {h.id: h for h in habitations}
    site_map = {s.id: s for s in sites}

    site_remaining = {
        site_id: max(0, effective_capacity_map.get(site_id, 0))
        for site_id in site_map
    }

    sorted_habitations = sorted(
        habitations,
        key=lambda h: h.priority_rank if h.priority_rank is not None else 999
    )

    assignments: List[RelocationAssignment] = []

    for habitation in sorted_habitations:
        population = int(habitation.population)
        best_site = None
        best_route_id = None
        best_distance_km = None
        best_travel_time_min = None

        for site in sites:
            if site_remaining.get(site.id, 0) < population:
                continue

            feasibility = check_route_feasibility(habitation.id, site.id)
            if feasibility.feasible:
                best_site = site
                best_route_id = feasibility.route_used
                best_distance_km = feasibility.distance_km
                best_travel_time_min = feasibility.travel_time_min
                break
            else:
                candidates = get_route_candidates(habitation.id)
                for candidate in candidates:
                    if candidate.get("site_id") == site.id and candidate.get("status") == "open":
                        best_site = site
                        best_route_id = candidate.get("route_id")
                        best_distance_km = candidate.get("distance_km")
                        best_travel_time_min = candidate.get("travel_time_min")
                        break
                if best_site:
                    break

        if best_site and best_route_id:
            site_remaining[best_site.id] -= population

            assignments.append(
                RelocationAssignment(
                    habitation_id=habitation.id,
                    habitation_name=habitation.name,
                    assigned_site_id=best_site.id,
                    assigned_site_name=best_site.name,
                    population=population,
                    priority_rank=habitation.priority_rank,
                    route_status="feasible",
                    route_id=best_route_id,
                    distance_km=best_distance_km,
                    travel_time_min=best_travel_time_min,
                    site_remaining_capacity=site_remaining[best_site.id],
                )
            )

    return assignments


# =============================================================================
# MAIN OPTIMIZATION
# =============================================================================


def run_relocation_optimization(
    habitation_ids: Optional[List[str]] = None,
    site_ids: Optional[List[str]] = None,
    time_limit_seconds: int = 30,
) -> OptimizationResponse:
    """
    Generate a relocation plan.

    Behavior:
    - Uses accessible habitations by default.
    - Uses sites with positive effective capacity.
    - Uses effective capacity instead of physical capacity.
    - Keeps habitations whole.
    - Uses route feasibility checks.
    - Returns partial assignments when complete relocation is impossible.
    - Marks the final plan INFEASIBLE when population remains unmet.
    """

    start_time = time.perf_counter()

    # -----------------------------------------------------------------
    # Load local deterministic demo data
    # -----------------------------------------------------------------

    all_habitations = get_habitations()
    all_sites = get_sites()
    all_routes = get_routes()

    # Kept for compatibility with the existing data layer.
    # Normal shelters are not currently used as relocation sites.
    _ = get_shelters()

    # -----------------------------------------------------------------
    # Filter habitations
    # -----------------------------------------------------------------

    if habitation_ids:

        selected_habitations = [
            habitation
            for habitation in all_habitations
            if habitation.id in habitation_ids
        ]

    else:

        selected_habitations = [
            habitation
            for habitation in all_habitations
            if habitation.is_accessible
        ]

    # -----------------------------------------------------------------
    # Calculate effective capacities
    # -----------------------------------------------------------------

    effective_capacity_map = _effective_capacity_map()

    # -----------------------------------------------------------------
    # Filter relocation sites
    # -----------------------------------------------------------------

    if site_ids:

        selected_sites = [
            site
            for site in all_sites
            if site.id in site_ids
        ]

    else:

        selected_sites = [
            site
            for site in all_sites
            if _available_effective_capacity(
                site,
                effective_capacity_map,
            ) > 0
        ]

    # -----------------------------------------------------------------
    # No habitations
    # -----------------------------------------------------------------

    if not selected_habitations:

        return OptimizationResponse(
            status=OptimizationStatus.INFEASIBLE,
            assignments=[],
            total_assigned_population=0,
            total_unmet_population=0,
            site_capacities={},
            infeasibility_reasons=[
                InfeasibilityReason(
                    constraint="no_habitations",
                    description=(
                        "No habitations were selected for "
                        "relocation optimization."
                    ),
                    affected_habitations=[],
                    severity="critical",
                    recommendation=(
                        "Select at least one accessible "
                        "habitation."
                    ),
                )
            ],
            computation_time_ms=(
                (
                    time.perf_counter()
                    - start_time
                )
                * 1000
            ),
            solver_stats={},
        )

    # -----------------------------------------------------------------
    # No sites
    # -----------------------------------------------------------------

    if not selected_sites:

        total_population = sum(
            int(habitation.population)
            for habitation in selected_habitations
        )

        return OptimizationResponse(
            status=OptimizationStatus.INFEASIBLE,
            assignments=[],
            total_assigned_population=0,
            total_unmet_population=total_population,
            site_capacities={},
            infeasibility_reasons=[
                InfeasibilityReason(
                    constraint="no_effective_capacity",
                    description=(
                        "No relocation site has positive "
                        "available effective capacity."
                    ),
                    affected_habitations=[
                        habitation.id
                        for habitation
                        in selected_habitations
                    ],
                    severity="critical",
                    recommendation=(
                        "Restore infrastructure, increase "
                        "effective site capacity, or activate "
                        "another safe relocation site."
                    ),
                )
            ],
            computation_time_ms=(
                (
                    time.perf_counter()
                    - start_time
                )
                * 1000
            ),
            solver_stats={},
        )

    # -----------------------------------------------------------------
    # Build optimizer inputs
    # -----------------------------------------------------------------

    optimizer_habitations = (
        _build_optimizer_habitations(
            selected_habitations,
            selected_sites,
        )
    )

    optimizer_shelters = (
        _build_optimizer_shelters_from_sites(
            selected_sites
        )
    )

    optimizer_routes = (
        _build_optimizer_routes(
            all_routes
        )
    )

    # The restored optimizer already models these locations through
    # shelters. Keeping this list empty avoids duplicate variables.
    optimizer_sites = []

    constraints = _build_constraints()
    objectives = _build_objectives()

    # -----------------------------------------------------------------
    # Run OR-Tools optimizer
    # -----------------------------------------------------------------

    optimizer = create_optimizer(
        time_limit_seconds=max(
            1,
            int(time_limit_seconds),
        )
    )

    opt_result = optimizer.solve(
        optimizer_habitations,
        optimizer_shelters,
        optimizer_routes,
        optimizer_sites,
        constraints,
        objectives,
    )

    # -----------------------------------------------------------------
    # Greedy fallback if CP-SAT fails
    # -----------------------------------------------------------------

    use_greedy = opt_result.status in ("TIMEOUT", "UNKNOWN", "INFEASIBLE")

    if use_greedy:
        assignments = _greedy_fallback(
            selected_habitations,
            selected_sites,
            effective_capacity_map,
        )

        site_capacities = {}
        for site in selected_sites:
            eff_cap = effective_capacity_map.get(site.id, 0)
            allocated = sum(
                a.population for a in assignments if a.assigned_site_id == site.id
            )
            remaining = max(0, eff_cap - allocated)
            site_capacities[site.id] = SiteCapacitySummary(
                site_id=site.id,
                site_name=site.name,
                max_capacity=eff_cap,
                current_allocation=0,
                allocated_population=allocated,
                remaining_capacity=remaining,
                assigned_habitations=[
                    a.habitation_id for a in assignments if a.assigned_site_id == site.id
                ],
            )

        infeasibility_reasons = []
        total_assigned = sum(a.population for a in assignments)
        total_population = sum(int(h.population) for h in selected_habitations)
        total_unmet = max(0, total_population - total_assigned)

        if total_unmet > 0:
            unassigned_ids = [
                h.id for h in selected_habitations
                if h.id not in {a.habitation_id for a in assignments}
            ]
            infeasibility_reasons.append(
                InfeasibilityReason(
                    constraint="greedy_fallback_unmet",
                    description=(
                        f"{total_unmet} people remain unassigned after greedy fallback. "
                        f"CP-SAT status: {opt_result.status}."
                    ),
                    affected_habitations=unassigned_ids,
                    severity="critical",
                    recommendation=(
                        "Increase effective site capacity, restore routes, "
                        "or add relocation sites."
                    ),
                )
            )

        final_status = OptimizationStatus.FEASIBLE if total_unmet == 0 else OptimizationStatus.INFEASIBLE
        computation_time_ms = (time.perf_counter() - start_time) * 1000

        return OptimizationResponse(
            status=final_status,
            assignments=assignments,
            total_assigned_population=total_assigned,
            total_unmet_population=total_unmet,
            site_capacities=site_capacities,
            infeasibility_reasons=infeasibility_reasons,
            computation_time_ms=computation_time_ms,
            solver_stats={"fallback": "greedy", "cp_sat_status": opt_result.status},
        )

    # -----------------------------------------------------------------
    # Convert CP-SAT results
    # -----------------------------------------------------------------

    assignments = _build_assignments(
        opt_result,
        selected_habitations,
        selected_sites,
    )

    site_capacities = _build_site_capacities(
        opt_result,
        selected_sites,
        selected_habitations,
    )

    infeasibility_reasons = (
        _build_infeasibility_reasons(
            opt_result,
            selected_habitations,
            selected_sites,
        )
    )

    total_assigned = sum(
        assignment.population
        for assignment in assignments
    )

    total_population = sum(
        int(habitation.population)
        for habitation
        in selected_habitations
    )

    total_unmet = max(
        0,
        total_population
        - total_assigned,
    )

    # -----------------------------------------------------------------
    # Determine final status
    # -----------------------------------------------------------------

    solver_status = _map_solver_status(
        opt_result.status
    )

    final_status = solver_status

    # A partial plan is useful for the dashboard but cannot be
    # considered fully feasible while people remain unassigned.
    if total_unmet > 0:

        final_status = (
            OptimizationStatus.INFEASIBLE
        )

        if not infeasibility_reasons:

            infeasibility_reasons.append(
                InfeasibilityReason(
                    constraint="unmet_population",
                    description=(
                        f"{total_unmet} people remain "
                        "unassigned after applying site, "
                        "route, and whole-habitation constraints."
                    ),
                    affected_habitations=list(
                        opt_result.unassigned_habitations
                    ),
                    severity="critical",
                    recommendation=(
                        "Restore blocked infrastructure, "
                        "increase effective capacity, or "
                        "activate additional relocation sites."
                    ),
                )
            )

    # -----------------------------------------------------------------
    # Computation time
    # -----------------------------------------------------------------

    computation_time_ms = (
        (
            time.perf_counter()
            - start_time
        )
        * 1000
    )

    reported_solver_time = (
        opt_result.computation_time_ms
        if opt_result.computation_time_ms
        else computation_time_ms
    )

    # -----------------------------------------------------------------
    # Return
    # -----------------------------------------------------------------

    return OptimizationResponse(
        status=final_status,
        assignments=assignments,
        total_assigned_population=total_assigned,
        total_unmet_population=total_unmet,
        site_capacities=site_capacities,
        infeasibility_reasons=infeasibility_reasons,
        computation_time_ms=reported_solver_time,
        solver_stats=opt_result.solver_stats,
    )


# =============================================================================
# What-If Simulation
# =============================================================================

import copy
import uuid
from contextlib import contextmanager


@contextmanager
def _temporary_site_capacity_change(site_id: str, new_capacity: int):
    """Context manager to temporarily change a site's max_capacity."""
    from app.services.data_layer import get_site_by_id, get_sites
    from app.services.intelligence import get_all_effective_capacities as get_all_eff_cap_fn
    site = get_site_by_id(site_id)
    if not site:
        yield
        return
    original_capacity = site.max_capacity
    site.max_capacity = new_capacity
    # Clear caches
    get_sites.cache_clear()
    get_all_eff_cap_fn.cache_clear()
    try:
        yield
    finally:
        site.max_capacity = original_capacity
        get_sites.cache_clear()
        get_all_eff_cap_fn.cache_clear()


@contextmanager
def _temporary_route_status_change(route_id: str, new_status: str):
    """Context manager to temporarily change a route's status."""
    from app.services.data_layer import get_route_by_id, get_routes
    route = get_route_by_id(route_id)
    if not route:
        yield
        return
    original_status = route.status
    route.status = new_status
    # Clear routes cache
    get_routes.cache_clear()
    try:
        yield
    finally:
        route.status = original_status
        get_routes.cache_clear()


def run_what_if_simulation(
    request: "WhatIfSimulationRequest",
    time_limit_seconds: int = 30,
) -> "WhatIfSimulationResult":
    """
    Run a what-if simulation with parameter deltas.
    
    Applies the requested changes temporarily, runs optimization,
    and returns the result without persisting any changes.
    
    Args:
        request: WhatIfSimulationRequest with parameter deltas
        time_limit_seconds: Solver time limit
        
    Returns:
        WhatIfSimulationResult with simulated plan and impact summary
    """
    from app.schemas.domain import WhatIfSimulationRequest, WhatIfSimulationResult, RelocationOptimizationResponse
    
    # Validate request type
    if not isinstance(request, WhatIfSimulationRequest):
        request = WhatIfSimulationRequest(**request)
    
    simulation_id = str(uuid.uuid4())[:8]
    changes_applied = {
        "capacity_changes": dict(request.capacity_changes),
        "route_closures": list(request.route_closures),
        "route_reopenings": list(request.route_reopenings),
        "habitation_additions": list(request.habitation_additions),
        "habitation_removals": list(request.habitation_removals),
        "site_additions": list(request.site_additions),
        "site_removals": list(request.site_removals),
    }
    
    # Context managers for cleanup
    site_cms = []
    route_closure_cms = []
    route_reopening_cms = []
    
    try:
        # Apply capacity changes
        for site_id, new_capacity in request.capacity_changes.items():
            cm = _temporary_site_capacity_change(site_id, new_capacity)
            cm.__enter__()
            site_cms.append(cm)
        
        # Apply route closures
        for route_id in request.route_closures:
            cm = _temporary_route_status_change(route_id, "impassable")
            cm.__enter__()
            route_closure_cms.append(cm)
        
        # Apply route reopenings
        for route_id in request.route_reopenings:
            cm = _temporary_route_status_change(route_id, "open")
            cm.__enter__()
            route_reopening_cms.append(cm)
        
        # Prepare habitation and site filters
        habitation_ids = None
        site_ids = None
        
        if request.habitation_additions or request.habitation_removals:
            from app.services.data_layer import get_habitations
            all_hab_ids = {h.id for h in get_habitations()}
            filtered = set(all_hab_ids)
            filtered.update(request.habitation_additions)
            filtered.difference_update(request.habitation_removals)
            habitation_ids = list(filtered)
        
        if request.site_additions or request.site_removals:
            from app.services.data_layer import get_sites
            all_site_ids = {s.id for s in get_sites()}
            filtered = set(all_site_ids)
            filtered.update(request.site_additions)
            filtered.difference_update(request.site_removals)
            site_ids = list(filtered)
        
        # Run optimization with modified parameters
        simulated_result = run_relocation_optimization(
            habitation_ids=habitation_ids,
            site_ids=site_ids,
            time_limit_seconds=time_limit_seconds,
        )
        
        # Convert OptimizationResponse (dataclass) to RelocationOptimizationResponse (Pydantic model)
        from app.schemas.domain import RelocationAssignmentResponse
        # Convert assignments from dataclass to Pydantic model
        assignment_responses = [
            RelocationAssignmentResponse(
                habitation_id=a.habitation_id,
                habitation_name=a.habitation_name,
                assigned_site_id=a.assigned_site_id,
                assigned_site_name=a.assigned_site_name,
                population=a.population,
                priority_rank=a.priority_rank,
                route_status=a.route_status,
                route_id=a.route_id,
                distance_km=a.distance_km,
                travel_time_min=a.travel_time_min,
                site_remaining_capacity=a.site_remaining_capacity,
            )
            for a in simulated_result.assignments
        ]
        
        simulated_plan = RelocationOptimizationResponse(
            status=simulated_result.status,
            assignments=assignment_responses,
            total_assigned_population=simulated_result.total_assigned_population,
            total_unmet_population=simulated_result.total_unmet_population,
            site_capacities=simulated_result.site_capacities,
            infeasibility_reasons=simulated_result.infeasibility_reasons,
            computation_time_ms=simulated_result.computation_time_ms,
            solver_stats=simulated_result.solver_stats,
        )
        
        # Build impact summary
        impact_summary = {
            "total_assigned_population": simulated_result.total_assigned_population,
            "total_unmet_population": simulated_result.total_unmet_population,
            "optimization_status": simulated_result.status.value,
            "num_assignments": len(simulated_result.assignments),
            "num_infeasibility_reasons": len(simulated_result.infeasibility_reasons),
        }
        
        return WhatIfSimulationResult(
            simulation_id=simulation_id,
            scenario_name=request.scenario_name,
            base_plan_id=request.base_plan_id,
            simulated_plan=simulated_plan,
            changes_applied=changes_applied,
            impact_summary=impact_summary,
        )
    finally:
        # Clean up all temporary changes
        for cm in site_cms:
            cm.__exit__(None, None, None)
        for cm in route_closure_cms:
            cm.__exit__(None, None, None)
        for cm in route_reopening_cms:
            cm.__exit__(None, None, None)