"""
Tests for hazard zones endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_hazards(client: AsyncClient):
    """Test /api/v1/hazards endpoint."""
    response = await client.get("/api/v1/hazards")
    assert response.status_code == 200
    data = response.json()
    
    assert "hazards" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    
    assert data["total"] > 0
    assert len(data["hazards"]) > 0
    
    # Check first hazard structure
    hazard = data["hazards"][0]
    assert "id" in hazard
    assert "hazard_type" in hazard
    assert "severity" in hazard
    assert "return_period_years" in hazard
    assert "source" in hazard
    assert "last_updated" in hazard


@pytest.mark.asyncio
async def test_list_hazards_pagination(client: AsyncClient):
    """Test hazards pagination."""
    response = await client.get("/api/v1/hazards?page=1&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 3
    assert len(data["hazards"]) <= 3


@pytest.mark.asyncio
async def test_list_hazards_by_type(client: AsyncClient):
    """Test hazards with hazard_type filter."""
    response = await client.get("/api/v1/hazards?hazard_type=flood")
    assert response.status_code == 200
    data = response.json()
    
    for hazard in data["hazards"]:
        assert hazard["hazard_type"] == "flood"
    
    response2 = await client.get("/api/v1/hazards?hazard_type=erosion")
    assert response2.status_code == 200
    data2 = response2.json()
    
    for hazard in data2["hazards"]:
        assert hazard["hazard_type"] == "erosion"


@pytest.mark.asyncio
async def test_list_hazards_by_severity(client: AsyncClient):
    """Test hazards with severity filter."""
    response = await client.get("/api/v1/hazards?severity=high")
    assert response.status_code == 200
    data = response.json()
    
    for hazard in data["hazards"]:
        assert hazard["severity"] == "high"


@pytest.mark.asyncio
async def test_get_hazard_by_id(client: AsyncClient):
    """Test /api/v1/hazards/{id} endpoint."""
    list_response = await client.get("/api/v1/hazards")
    assert list_response.status_code == 200
    hazards = list_response.json()["hazards"]
    assert len(hazards) > 0
    
    hazard_id = hazards[0]["id"]
    
    response = await client.get(f"/api/v1/hazards/{hazard_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == hazard_id


@pytest.mark.asyncio
async def test_get_hazard_not_found(client: AsyncClient):
    """Test 404 for non-existent hazard."""
    response = await client.get("/api/v1/hazards/non_existent_id")
    assert response.status_code == 404