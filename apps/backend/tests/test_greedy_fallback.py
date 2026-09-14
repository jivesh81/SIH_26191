"""
Tests for greedy fallback in relocation optimization.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.optimization import run_relocation_optimization, _greedy_fallback
from app.services.data_layer import get_habitations, get_sites
from app.schemas.domain import OptimizationStatus, InfeasibilityReason


class TestGreedyFallback:
    """Tests for greedy fallback when CP-SAT fails."""

    def test_greedy_fallback_assigns_by_priority(self):
        """Test that greedy fallback assigns habitations by priority order."""
        habitations = get_habitations()
        sites = get_sites()

        from app.services.intelligence import get_all_effective_capacities
        eff_caps = get_all_effective_capacities()
        effective_capacity_map = {c.site_id: c.effective_capacity for c in eff_caps}

        # Use only accessible habitations
        accessible_habs = [h for h in habitations if h.is_accessible]
        sites_with_cap = [s for s in sites if effective_capacity_map.get(s.id, 0) > 0]

        assignments = _greedy_fallback(accessible_habs, sites_with_cap, effective_capacity_map)

        # Should assign some habitations
        assert len(assignments) > 0

        # Check priority ordering
        priorities = [a.priority_rank for a in assignments if a.priority_rank is not None]
        assert priorities == sorted(priorities)

    def test_greedy_fallback_respects_capacity(self):
        """Test that greedy fallback never exceeds site effective capacity."""
        habitations = get_habitations()
        sites = get_sites()

        from app.services.intelligence import get_all_effective_capacities
        eff_caps = get_all_effective_capacities()
        effective_capacity_map = {c.site_id: c.effective_capacity for c in eff_caps}

        accessible_habs = [h for h in habitations if h.is_accessible]
        sites_with_cap = [s for s in sites if effective_capacity_map.get(s.id, 0) > 0]

        assignments = _greedy_fallback(accessible_habs, sites_with_cap, effective_capacity_map)

        # Verify capacity not exceeded
        site_allocated = {}
        for a in assignments:
            site_allocated[a.assigned_site_id] = site_allocated.get(a.assigned_site_id, 0) + a.population

        for site in sites_with_cap:
            allocated = site_allocated.get(site.id, 0)
            assert allocated <= effective_capacity_map.get(site.id, 0)

    def test_greedy_fallback_route_feasibility(self):
        """Test that greedy fallback only assigns when route is feasible."""
        habitations = get_habitations()
        sites = get_sites()

        from app.services.intelligence import get_all_effective_capacities, check_route_feasibility
        eff_caps = get_all_effective_capacities()
        effective_capacity_map = {c.site_id: c.effective_capacity for c in eff_caps}

        accessible_habs = [h for h in habitations if h.is_accessible]
        sites_with_cap = [s for s in sites if effective_capacity_map.get(s.id, 0) > 0]

        assignments = _greedy_fallback(accessible_habs, sites_with_cap, effective_capacity_map)

        # Every assignment should have feasible route
        for a in assignments:
            feasibility = check_route_feasibility(a.habitation_id, a.assigned_site_id)
            assert feasibility.feasible, f"Route {a.route_id} should be feasible for {a.habitation_id} -> {a.assigned_site_id}"
            assert a.route_status == "feasible"

    def test_optimization_uses_greedy_on_timeout(self):
        """Test that optimization falls back to greedy when CP-SAT times out."""
        # Mock the optimizer to return TIMEOUT
        from optimizer import RelocationOptimizer, OptimizationResult
        from app.services import optimization as opt_module

        original_solve = RelocationOptimizer.solve

        def mock_solve(self, *args, **kwargs):
            return OptimizationResult(
                status="TIMEOUT",
                objective_value=float('inf'),
                assignments={},
                route_assignments={},
                relocation_assignments={},
                unassigned_habitations=[],
                infeasibility_reasons=[],
                computation_time_ms=30000,
                solver_stats={},
            )

        with patch.object(RelocationOptimizer, 'solve', mock_solve):
            result = run_relocation_optimization(time_limit_seconds=1)

        # Should use greedy fallback
        assert result.solver_stats.get("fallback") == "greedy"
        assert result.solver_stats.get("cp_sat_status") == "TIMEOUT"
        assert result.status in [OptimizationStatus.FEASIBLE, OptimizationStatus.INFEASIBLE]

    def test_optimization_uses_greedy_on_unknown(self):
        """Test that optimization falls back to greedy when CP-SAT returns UNKNOWN."""
        from optimizer import RelocationOptimizer, OptimizationResult

        def mock_solve(self, *args, **kwargs):
            return OptimizationResult(
                status="UNKNOWN",
                objective_value=float('inf'),
                assignments={},
                route_assignments={},
                relocation_assignments={},
                unassigned_habitations=[],
                infeasibility_reasons=[],
                computation_time_ms=1000,
                solver_stats={},
            )

        with patch.object(RelocationOptimizer, 'solve', mock_solve):
            result = run_relocation_optimization(time_limit_seconds=1)

        assert result.solver_stats.get("fallback") == "greedy"
        assert result.solver_stats.get("cp_sat_status") == "UNKNOWN"

    def test_optimization_uses_greedy_on_infeasible(self):
        """Test that optimization falls back to greedy when CP-SAT returns INFEASIBLE."""
        from optimizer import RelocationOptimizer, OptimizationResult

        def mock_solve(self, *args, **kwargs):
            return OptimizationResult(
                status="INFEASIBLE",
                objective_value=float('inf'),
                assignments={},
                route_assignments={},
                relocation_assignments={},
                unassigned_habitations=[],
                infeasibility_reasons=[],
                computation_time_ms=1000,
                solver_stats={},
            )

        with patch.object(RelocationOptimizer, 'solve', mock_solve):
            result = run_relocation_optimization(time_limit_seconds=1)

        assert result.solver_stats.get("fallback") == "greedy"
        assert result.solver_stats.get("cp_sat_status") == "INFEASIBLE"

    def test_greedy_fallback_infeasibility_reasons(self):
        """Test that greedy fallback produces infeasibility reasons when unmet population exists."""
        from optimizer import RelocationOptimizer, OptimizationResult

        def mock_solve(self, *args, **kwargs):
            return OptimizationResult(
                status="INFEASIBLE",
                objective_value=float('inf'),
                assignments={},
                route_assignments={},
                relocation_assignments={},
                unassigned_habitations=[],
                infeasibility_reasons=[],
                computation_time_ms=1000,
                solver_stats={},
            )

        with patch.object(RelocationOptimizer, 'solve', mock_solve):
            result = run_relocation_optimization(time_limit_seconds=1)

        # Should have infeasibility reasons if unmet population
        if result.total_unmet_population > 0:
            assert len(result.infeasibility_reasons) > 0
            greedy_reasons = [r for r in result.infeasibility_reasons if r.constraint == "greedy_fallback_unmet"]
            assert len(greedy_reasons) > 0