"""
Tests for relocation optimization (Step 4).
"""

import pytest
from typing import List

from app.services.optimization import (
    run_relocation_optimization,
    _build_optimizer_habitations,
    _build_optimizer_shelters,
    _build_optimizer_routes,
    _build_optimizer_shelters_from_sites,
)
from app.services.data_layer import get_habitations, get_sites, get_routes, get_shelters
from app.schemas.domain import OptimizationStatus, InfeasibilityReason


class TestOptimizationFeasibleCase:
    """Tests for feasible optimization scenarios."""

    def test_optimization_with_all_defaults(self):
        """Test optimization runs with default parameters (all accessible habitations, all sites)."""
        result = run_relocation_optimization()
       
        # Should return a valid response structure
        assert result.status in [OptimizationStatus.OPTIMAL, OptimizationStatus.FEASIBLE, OptimizationStatus.INFEASIBLE]
        assert isinstance(result.assignments, list)
        assert isinstance(result.total_assigned_population, int)
        assert isinstance(result.total_unmet_population, int)
        assert isinstance(result.site_capacities, dict)
        assert isinstance(result.infeasibility_reasons, list)
        assert result.computation_time_ms >= 0
        assert isinstance(result.solver_stats, dict)

    def test_optimization_assigns_high_priority_first(self):
        """Test that higher priority habitations are assigned first."""
        result = run_relocation_optimization()
       
        if result.assignments:
            priorities = [a.priority_rank for a in result.assignments if a.priority_rank is not None]
            # Should be sorted by priority (lower number = higher priority)
            assert priorities == sorted(priorities)

    def test_optimization_respects_site_capacity(self):
        """Test that site capacity is never exceeded."""
        result = run_relocation_optimization()
       
        for site_id, capacity_info in result.site_capacities.items():
            assert capacity_info.allocated_population <= capacity_info.max_capacity
            assert capacity_info.remaining_capacity >= 0
            assert capacity_info.max_capacity == capacity_info.current_allocation + capacity_info.allocated_population + capacity_info.remaining_capacity

    def test_optimization_returns_route_info(self):
        """Test that assignments include route feasibility information."""
        result = run_relocation_optimization()
       
        for assignment in result.assignments:
            assert assignment.route_status in ["feasible", "infeasible"]
            assert assignment.habitation_id
            assert assignment.assigned_site_id
            assert assignment.population > 0

    def test_optimization_total_population_accounted(self):
        """Test that total assigned + unmet equals total population of selected habitations."""
        from app.services.data_layer import get_habitations
       
        habitations = [h for h in get_habitations() if h.is_accessible]
        total_pop = sum(h.population for h in habitations)
       
        result = run_relocation_optimization()
       
        # Note: If infeasible, unmet > 0, but assigned + unmet should still equal total
        assert result.total_assigned_population + result.total_unmet_population == total_pop


class TestOptimizationCapacityConstraint:
    """Tests for capacity constraint scenarios."""

    def test_optimization_with_limited_sites(self):
        """Test optimization with only one small site."""
        # Use only the smallest site (site_006: 1800 capacity)
        result = run_relocation_optimization(site_ids=["site_006"])
       
        # Should be infeasible, feasible, or optimal (solver found optimal solution with 0 assignments)
        assert result.status in [OptimizationStatus.OPTIMAL, OptimizationStatus.FEASIBLE, OptimizationStatus.INFEASIBLE]
       
        # Total assigned should not exceed site capacity
        site_cap = result.site_capacities.get("site_006")
        if site_cap:
            assert site_cap.allocated_population <= site_cap.max_capacity

    def test_optimization_with_single_habitation(self):
        """Test optimization with a single habitation."""
        result = run_relocation_optimization(habitation_ids=["hab_001"])
       
        assert result.status in [OptimizationStatus.OPTIMAL, OptimizationStatus.FEASIBLE, OptimizationStatus.INFEASIBLE]
       
        if result.assignments:
            assert len(result.assignments) <= 1
            if result.assignments:
                assert result.assignments[0].habitation_id == "hab_001"

    def test_optimization_site_remaining_capacity_tracked(self):
        """Test that site remaining capacity is correctly tracked."""
        result = run_relocation_optimization(habitation_ids=["hab_001", "hab_002"])
       
        for site_id, capacity_info in result.site_capacities.items():
            # Remaining capacity should equal max - current - allocated
            expected_remaining = (
                capacity_info.max_capacity
                - capacity_info.current_allocation
                - capacity_info.allocated_population
            )
            assert capacity_info.remaining_capacity == expected_remaining


class TestOptimizationInfeasibleCase:
    """Tests for infeasible optimization scenarios."""

    def test_optimization_no_sites_returns_infeasible(self):
        """Test optimization with no available sites returns INFEASIBLE."""
        # Use a site ID that doesn't exist
        result = run_relocation_optimization(site_ids=["non_existent_site"])
       
        assert result.status == OptimizationStatus.INFEASIBLE
        assert result.total_assigned_population == 0
        assert result.total_unmet_population > 0
        assert len(result.infeasibility_reasons) > 0
       
        # Check for capacity-related infeasibility reason
        capacity_reasons = [
            r for r in result.infeasibility_reasons
            if r.constraint in ["no_effective_capacity", "effective_capacity"]
        ]
        assert len(capacity_reasons) > 0

    def test_optimization_no_habitations_returns_infeasible(self):
        """Test optimization with no habitations returns INFEASIBLE."""
        result = run_relocation_optimization(habitation_ids=["non_existent_hab"])
       
        assert result.status == OptimizationStatus.INFEASIBLE
        assert len(result.infeasibility_reasons) > 0
       
        hab_reasons = [
            r for r in result.infeasibility_reasons
            if r.constraint == "no_habitations"
        ]
        assert len(hab_reasons) > 0

    def test_optimization_infeasible_has_machine_readable_reason(self):
        """Test that infeasible result includes machine-readable bottleneck reason."""
        result = run_relocation_optimization(site_ids=["non_existent_site"])
       
        assert result.status == OptimizationStatus.INFEASIBLE
        assert len(result.infeasibility_reasons) > 0
       
        for reason in result.infeasibility_reasons:
            assert isinstance(reason, InfeasibilityReason)
            assert reason.constraint
            assert reason.description
            assert isinstance(reason.affected_habitations, list)
            assert reason.severity in ["warning", "critical"]
            assert reason.recommendation

    def test_optimization_insufficient_capacity_detected(self):
        """Test that capacity shortfall is detected and reported."""
        # Select many habitations but only one small site
        hab_ids = ["hab_001", "hab_002", "hab_003", "hab_004", "hab_005"]
        result = run_relocation_optimization(habitation_ids=hab_ids, site_ids=["site_006"])
       
        # Total population of selected habitations
        from app.services.data_layer import get_habitation_by_id
        total_pop = sum(get_habitation_by_id(hid).population for hid in hab_ids)
        site_cap = 1800  # site_006 max capacity
       
        if total_pop > site_cap:
            # Should be infeasible or partially assigned
            assert result.total_unmet_population > 0 or result.status == OptimizationStatus.INFEASIBLE
           
            # Should have capacity-related infeasibility reason
            capacity_reasons = [
                r for r in result.infeasibility_reasons
                if r.constraint in ["effective_capacity", "whole_habitation_capacity"]
            ]
            if result.total_unmet_population > 0:
                assert len(capacity_reasons) > 0


class TestOptimizationIntegration:
    """Integration tests for optimization components."""

    def test_optimizer_habitations_built_correctly(self):
        """Test that optimizer habitations are built from data layer correctly."""
        habitations = get_habitations()
        opt_habs = _build_optimizer_habitations(habitations)
       
        assert len(opt_habs) == len(habitations)
        for opt_hab, hab in zip(opt_habs, habitations):
            assert opt_hab.id == hab.id
            assert opt_hab.population == hab.population
            assert opt_hab.vulnerability_score == hab.vulnerability_score

    def test_optimizer_sites_use_effective_capacity(self):
        """Test that optimizer shelters (from sites) use effective capacity from intelligence module."""
        sites = get_sites()
        opt_shelters = _build_optimizer_shelters_from_sites(sites)
       
        assert len(opt_shelters) == len(sites)
        for opt_site in opt_shelters:
            # Effective capacity should be <= physical max_capacity
            original_site = next(s for s in sites if s.id == opt_site.id)
            assert opt_site.effective_capacity <= original_site.max_capacity

    def test_optimizer_routes_built_correctly(self):
        """Test that optimizer routes are built from data layer correctly."""
        routes = get_routes()
        opt_routes = _build_optimizer_routes(routes)
       
        assert len(opt_routes) == len(routes)
        for opt_route, route in zip(opt_routes, routes):
            assert opt_route.id == route.id
            assert opt_route.length_km == route.length_km
            assert opt_route.travel_time_min == route.travel_time_min
            assert opt_route.capacity_per_hour == route.capacity_per_hour

    def test_optimizer_shelters_built_correctly(self):
        """Test that optimizer shelters are built from data layer correctly."""
        shelters = get_shelters()
        opt_shelters = _build_optimizer_shelters(shelters)
       
        assert len(opt_shelters) == len(shelters)
        for opt_shelter, shelter in zip(opt_shelters, shelters):
            assert opt_shelter.id == shelter.id
            assert opt_shelter.nominal_capacity == shelter.capacity
            assert opt_shelter.effective_capacity == shelter.effective_capacity
            assert opt_shelter.current_occupancy == shelter.current_occupancy


class TestOptimizationResponseSchema:
    """Test that response schemas work correctly."""

    def test_relocation_assignment_response_schema(self):
        from app.schemas.domain import RelocationAssignmentResponse
       
        assignment = RelocationAssignmentResponse(
            habitation_id="hab_001",
            habitation_name="Test Habitation",
            assigned_site_id="site_001",
            assigned_site_name="Test Site",
            population=1000,
            priority_rank=1,
            route_status="feasible",
            route_id="route_001",
            distance_km=10.5,
            travel_time_min=25.0,
            site_remaining_capacity=4000,
        )
       
        assert assignment.habitation_id == "hab_001"
        assert assignment.route_status == "feasible"

    def test_site_capacity_summary_schema(self):
        from app.schemas.domain import SiteCapacitySummary
       
        summary = SiteCapacitySummary(
            site_id="site_001",
            site_name="Test Site",
            max_capacity=5000,
            current_allocation=0,
            allocated_population=1000,
            remaining_capacity=4000,
            assigned_habitations=["hab_001"],
        )
       
        assert summary.remaining_capacity == 4000
        assert summary.assigned_habitations == ["hab_001"]

    def test_relocation_optimization_response_schema(self):
        from app.schemas.domain import RelocationOptimizationResponse, RelocationAssignmentResponse, SiteCapacitySummary, InfeasibilityReason
       
        assignment = RelocationAssignmentResponse(
            habitation_id="hab_001",
            habitation_name="Test",
            assigned_site_id="site_001",
            assigned_site_name="Test Site",
            population=1000,
            priority_rank=1,
            route_status="feasible",
            site_remaining_capacity=4000,
        )
       
        summary = SiteCapacitySummary(
            site_id="site_001",
            site_name="Test Site",
            max_capacity=5000,
            current_allocation=0,
            allocated_population=1000,
            remaining_capacity=4000,
            assigned_habitations=["hab_001"],
        )
       
        reason = InfeasibilityReason(
            constraint="test",
            description="Test reason",
            affected_habitations=["hab_001"],
            severity="critical",
            recommendation="Test recommendation",
        )
       
        response = RelocationOptimizationResponse(
            status=OptimizationStatus.FEASIBLE,
            assignments=[assignment],
            total_assigned_population=1000,
            total_unmet_population=0,
            site_capacities={"site_001": summary},
            infeasibility_reasons=[reason],
            computation_time_ms=100.0,
            solver_stats={"conflicts": 10},
        )
       
        assert response.status == OptimizationStatus.FEASIBLE
        assert response.total_assigned_population == 1000