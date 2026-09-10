"""
Tests for relocation sites endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_sites(client: AsyncClient):
    """Test /api/v1/sites endpoint."""
    response = await client.get("/api/v1/sites")
    assert response.status_code == 200
    data = response.json()
    
    assert "sites" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    
    assert data["total"] > 0
    assert len(data["sites"]) > 0
    
    # Check first site structure
    site = data["sites"][0]
    assert "id" in site
    assert "name" in site
    assert "area_sqkm" in site
    assert "max_capacity" in site
    assert "current_allocation" in site
    assert "suitability_score" in site
    assert "elevation_m" in site
    assert "flood_risk" in site
    assert "land_ownership" in site
    assert "infrastructure_ready" in site
    assert "water_available" in site
    assert "power_available" in site
    assert "road_access" in site
    assert "available_capacity" in site
    assert "utilization_pct" in site


@pytest.mark.asyncio
async def test_list_sites_pagination(client: AsyncClient):
    """Test sites pagination."""
    response = await client.get("/api/v1/sites?page=1&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 3
    assert len(data["sites"]) <= 3


@pytest.mark.asyncio
async def test_list_sites_available_only(client: AsyncClient):
    """Test sites with available_only filter."""
    response = await client.get("/api/v1/sites?available_only=true")
    assert response.status_code == 200
    data = response.json()
    
    for site in data["sites"]:
        assert site["available_capacity"] > 0


@pytest.mark.asyncio
async def test_get_site_by_id(client: AsyncClient):
    """Test /api/v1/sites/{id} endpoint."""
    list_response = await client.get("/api/v1/sites")
    assert list_response.status_code == 200
    sites = list_response.json()["sites"]
    assert len(sites) > 0
    
    site_id = sites[0]["id"]
    
    response = await client.get(f"/api/v1/sites/{site_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == site_id


@pytest.mark.asyncio
async def test_get_site_not_found(client: AsyncClient):
    """Test 404 for non-existent site."""
    response = await client.get("/api/v1/sites/non_existent_id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_site_properties_calculated(client: AsyncClient):
    """Test that computed properties work correctly."""
    response = await client.get("/api/v1/sites")
    assert response.status_code == 200
    data = response.json()
    
    for site in data["sites"]:
        # available_capacity = max_capacity - current_allocation
        expected_available = site["max_capacity"] - site["current_allocation"]
        assert site["available_capacity"] == expected_available
        
        # utilization_pct = (current_allocation / max_capacity) * 100
        if site["max_capacity"] > 0:
            expected_util = (site["current_allocation"] / site["max_capacity"]) * 100
            assert abs(site["utilization_pct"] - expected_util) < 0.01