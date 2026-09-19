"""
Test for /plan/simulate endpoint - what-if simulation.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_simulate_capacity_change(client):
    """Test what-if simulation with capacity changes."""
    # Get baseline first
    baseline_response = client.post("/api/v1/optimization/relocation", json={})
    assert baseline_response.status_code == 200
    baseline = baseline_response.json()
    baseline_capacity = baseline["site_capacities"]["site_001"]["max_capacity"]
    baseline_unmet = baseline["total_unmet_population"]
    
    response = client.post(
        "/api/v1/plan/simulate",
        json={"capacity_changes": {"site_001": 8000}},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    
    # Check required fields
    assert "simulation_id" in data
    assert "scenario_name" in data
    assert "simulated_plan" in data
    assert "changes_applied" in data
    assert "impact_summary" in data
    
    # Check simulated plan structure
    plan = data["simulated_plan"]
    assert "status" in plan
    assert "assignments" in plan
    assert "total_assigned_population" in plan
    assert "total_unmet_population" in plan
    assert "site_capacities" in plan
    assert "infeasibility_reasons" in plan
    assert "computation_time_ms" in plan
    assert "solver_stats" in plan
    
    # Check that capacity change was applied
    assert data["changes_applied"]["capacity_changes"] == {"site_001": 8000}
    
    # Verify the SIMULATED OUTCOME actually differs from baseline
    simulated_capacity = plan["site_capacities"]["site_001"]["max_capacity"]
    simulated_unmet = plan["total_unmet_population"]
    
    # The capacity should reflect the change (8000), not the original baseline
    assert simulated_capacity == 8000, f"Expected simulated capacity 8000, got {simulated_capacity}"
    
    # For a capacity increase, total_unmet_population should be <= baseline (could be equal if other constraints bind)
    # But at minimum, the site capacity should have changed
    assert simulated_capacity != baseline_capacity, "Site capacity should differ from baseline after simulation"
    
    # Check impact summary
    impact = data["impact_summary"]
    assert "total_assigned_population" in impact
    assert "total_unmet_population" in impact
    assert "optimization_status" in impact
    assert "num_assignments" in impact
    assert "num_infeasibility_reasons" in impact


def test_simulate_route_closure(client):
    """Test what-if simulation with route closures."""
    response = client.post(
        "/api/v1/plan/simulate",
        json={"route_closures": ["route_howly_1"]},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["changes_applied"]["route_closures"] == ["route_howly_1"]


def test_simulate_multiple_changes(client):
    """Test what-if simulation with multiple parameter changes."""
    response = client.post(
        "/api/v1/plan/simulate",
        json={
            "capacity_changes": {"site_001": 8000},
            "route_closures": ["route_howly_1"],
            "route_reopenings": ["route_bajali_1"],
        },
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["changes_applied"]["capacity_changes"] == {"site_001": 8000}
    assert data["changes_applied"]["route_closures"] == ["route_howly_1"]
    assert data["changes_applied"]["route_reopenings"] == ["route_bajali_1"]


def test_simulate_habitation_changes(client):
    """Test what-if simulation with habitation additions/removals."""
    response = client.post(
        "/api/v1/plan/simulate",
        json={
            "habitation_additions": ["hab_999"],
            "habitation_removals": ["hab_001"],
        },
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert "hab_999" in data["changes_applied"]["habitation_additions"]
    assert "hab_001" in data["changes_applied"]["habitation_removals"]


def test_simulate_site_changes(client):
    """Test what-if simulation with site additions/removals."""
    response = client.post(
        "/api/v1/plan/simulate",
        json={
            "site_additions": ["site_999"],
            "site_removals": ["site_001"],
        },
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert "site_999" in data["changes_applied"]["site_additions"]
    assert "site_001" in data["changes_applied"]["site_removals"]


def test_simulate_with_time_limit(client):
    """Test what-if simulation with custom time limit."""
    response = client.post(
        "/api/v1/plan/simulate?time_limit_seconds=10",
        json={"capacity_changes": {"site_001": 8000}},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert data["simulated_plan"]["computation_time_ms"] > 0


def test_simulate_empty_request(client):
    """Test what-if simulation with empty request (should return current plan)."""
    response = client.post(
        "/api/v1/plan/simulate",
        json={},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert "simulated_plan" in data
    assert data["changes_applied"]["capacity_changes"] == {}


