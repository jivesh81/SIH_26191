"""
Tests for dashboard endpoint.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard(client: AsyncClient):
    """Test /api/v1/dashboard endpoint."""
    response = await client.get("/api/v1/dashboard")
    assert response.status_code == 200
    data = response.json()
    
    # Check structure
    assert "stats" in data
    assert "metadata" in data
    
    stats = data["stats"]
    
    # Check all required stats fields
    assert "total_habitations" in stats
    assert "total_population" in stats
    assert "high_vulnerability_habitations" in stats
    assert "total_shelters" in stats
    assert "active_shelters" in stats
    assert "total_shelter_capacity" in stats
    assert "total_effective_capacity" in stats
    assert "current_total_occupancy" in stats
    assert "shelter_utilization_pct" in stats
    assert "total_sites" in stats
    assert "total_site_capacity" in stats
    assert "total_routes" in stats
    assert "open_routes" in stats
    assert "impassable_routes" in stats
    assert "total_hazard_zones" in stats
    assert "high_severity_hazards" in stats
    assert "last_updated" in stats
    assert "data_source" in stats
    
    # Check values are reasonable (not zero for synthetic data)
    assert stats["total_habitations"] > 0
    assert stats["total_population"] > 0
    assert stats["total_shelters"] > 0
    assert stats["total_sites"] > 0
    assert stats["total_routes"] > 0
    assert stats["total_hazard_zones"] > 0
    
    # Check metadata
    metadata = data["metadata"]
    assert metadata["data_source"] == "synthetic_demo_data_barpeta"
    assert metadata["district"] == "Barpeta"
    assert metadata["state"] == "Assam"
    assert "synthetic" in metadata["note"].lower()