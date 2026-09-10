"""
Tests for evacuation routes endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_routes(client: AsyncClient):
    """Test /api/v1/routes endpoint."""
    response = await client.get("/api/v1/routes")
    assert response.status_code == 200
    data = response.json()
    
    assert "routes" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    
    assert data["total"] > 0
    assert len(data["routes"]) > 0
    
    # Check first route structure
    route = data["routes"][0]
    assert "id" in route
    assert "name" in route
    assert "route_type" in route
    assert "length_km" in route
    assert "travel_time_min" in route
    assert "capacity_per_hour" in route
    assert "current_load" in route
    assert "status" in route
    assert "bridge_dependencies" in route
    assert "last_assessment" in route
    assert "utilization_pct" in route
    assert "is_feasible" in route


@pytest.mark.asyncio
async def test_list_routes_pagination(client: AsyncClient):
    """Test routes pagination."""
    response = await client.get("/api/v1/routes?page=1&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 3
    assert len(data["routes"]) <= 3


@pytest.mark.asyncio
async def test_list_routes_open_only(client: AsyncClient):
    """Test routes with open_only filter."""
    response = await client.get("/api/v1/routes?open_only=true")
    assert response.status_code == 200
    data = response.json()
    
    for route in data["routes"]:
        assert route["status"] == "open"
        assert route["is_feasible"] is True


@pytest.mark.asyncio
async def test_list_routes_by_type(client: AsyncClient):
    """Test routes with route_type filter."""
    response = await client.get("/api/v1/routes?route_type=primary")
    assert response.status_code == 200
    data = response.json()
    
    for route in data["routes"]:
        assert route["route_type"] == "primary"
    
    response2 = await client.get("/api/v1/routes?route_type=alternative")
    assert response2.status_code == 200
    data2 = response2.json()
    
    for route in data2["routes"]:
        assert route["route_type"] == "alternative"


@pytest.mark.asyncio
async def test_get_route_by_id(client: AsyncClient):
    """Test /api/v1/routes/{id} endpoint."""
    list_response = await client.get("/api/v1/routes")
    assert list_response.status_code == 200
    routes = list_response.json()["routes"]
    assert len(routes) > 0
    
    route_id = routes[0]["id"]
    
    response = await client.get(f"/api/v1/routes/{route_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == route_id


@pytest.mark.asyncio
async def test_get_route_not_found(client: AsyncClient):
    """Test 404 for non-existent route."""
    response = await client.get("/api/v1/routes/non_existent_id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_feasible_routes(client: AsyncClient):
    """Test /api/v1/routes/feasible endpoint."""
    response = await client.get("/api/v1/routes/feasible")
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    assert len(data) > 0
    
    for route in data:
        assert route["status"] == "open"
        assert route["is_feasible"] is True


@pytest.mark.asyncio
async def test_route_properties_calculated(client: AsyncClient):
    """Test that computed properties work correctly."""
    response = await client.get("/api/v1/routes")
    assert response.status_code == 200
    data = response.json()
    
    for route in data["routes"]:
        # utilization_pct = (current_load / capacity_per_hour) * 100
        if route["capacity_per_hour"] > 0:
            expected_util = (route["current_load"] / route["capacity_per_hour"]) * 100
            assert abs(route["utilization_pct"] - expected_util) < 0.01
        
        # is_feasible = status == "open"
        assert route["is_feasible"] == (route["status"] == "open")