"""
Tests for habitations endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_habitations(client: AsyncClient):
    """Test /api/v1/habitations endpoint."""
    response = await client.get("/api/v1/habitations")
    assert response.status_code == 200
    data = response.json()
    
    assert "habitations" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    
    assert data["total"] > 0
    assert len(data["habitations"]) > 0
    assert data["page"] == 1
    assert data["page_size"] == 50
    
    # Check first habitation structure
    hab = data["habitations"][0]
    assert "id" in hab
    assert "name" in hab
    assert "population" in hab
    assert "vulnerability_score" in hab
    assert "hazard_exposure" in hab
    assert "nearest_shelter_id" in hab
    assert "nearest_shelter_distance_m" in hab
    assert "evacuation_route_id" in hab
    assert "is_accessible" in hab
    assert "priority_rank" in hab


@pytest.mark.asyncio
async def test_list_habitations_pagination(client: AsyncClient):
    """Test habitations pagination."""
    response = await client.get("/api/v1/habitations?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["habitations"]) <= 5


@pytest.mark.asyncio
async def test_list_habitations_accessible_only(client: AsyncClient):
    """Test habitations with accessible_only filter."""
    response = await client.get("/api/v1/habitations?accessible_only=true")
    assert response.status_code == 200
    data = response.json()
    
    for hab in data["habitations"]:
        assert hab["is_accessible"] is True


@pytest.mark.asyncio
async def test_list_habitations_min_vulnerability(client: AsyncClient):
    """Test habitations with min_vulnerability filter."""
    response = await client.get("/api/v1/habitations?min_vulnerability=0.8")
    assert response.status_code == 200
    data = response.json()
    
    for hab in data["habitations"]:
        assert hab["vulnerability_score"] >= 0.8


@pytest.mark.asyncio
async def test_get_habitation_by_id(client: AsyncClient):
    """Test /api/v1/habitations/{id} endpoint."""
    # First get list to find a valid ID
    list_response = await client.get("/api/v1/habitations")
    assert list_response.status_code == 200
    habitations = list_response.json()["habitations"]
    assert len(habitations) > 0
    
    hab_id = habitations[0]["id"]
    
    # Now get by ID
    response = await client.get(f"/api/v1/habitations/{hab_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == hab_id


@pytest.mark.asyncio
async def test_get_habitation_not_found(client: AsyncClient):
    """Test 404 for non-existent habitation."""
    response = await client.get("/api/v1/habitations/non_existent_id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_high_vulnerability_habitations(client: AsyncClient):
    """Test /api/v1/habitations/high-vulnerability endpoint."""
    response = await client.get("/api/v1/habitations/high-vulnerability?threshold=0.7")
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    assert len(data) > 0
    
    for hab in data:
        assert hab["vulnerability_score"] >= 0.7
    
    # Test with different threshold
    response2 = await client.get("/api/v1/habitations/high-vulnerability?threshold=0.9")
    assert response2.status_code == 200
    data2 = response2.json()
    
    for hab in data2:
        assert hab["vulnerability_score"] >= 0.9