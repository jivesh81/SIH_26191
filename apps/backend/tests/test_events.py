"""
Tests for disaster events endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_events(client: AsyncClient):
    """Test /api/v1/events endpoint."""
    response = await client.get("/api/v1/events")
    assert response.status_code == 200
    data = response.json()
    
    assert "events" in data
    assert "total" in data
    
    assert data["total"] > 0
    assert len(data["events"]) > 0
    
    # Check first event structure
    event = data["events"][0]
    assert "event_type" in event
    assert "intensity" in event
    assert "affected_area" in event
    assert "duration_hours" in event
    assert "timestamp" in event
    assert "metadata" in event
    
    # Check event types are valid
    valid_types = ["rainfall", "bridge_collapse", "capacity_reduction", "combined"]
    for event in data["events"]:
        assert event["event_type"] in valid_types
        assert 0.0 <= event["intensity"] <= 1.0
        assert event["duration_hours"] > 0
        assert "min_lng" in event["affected_area"]
        assert "min_lat" in event["affected_area"]
        assert "max_lng" in event["affected_area"]
        assert "max_lat" in event["affected_area"]


@pytest.mark.asyncio
async def test_event_types(client: AsyncClient):
    """Test that all expected event types are present."""
    response = await client.get("/api/v1/events")
    assert response.status_code == 200
    data = response.json()
    
    event_types = {event["event_type"] for event in data["events"]}
    
    # Should have at least these three types
    assert "rainfall" in event_types
    assert "bridge_collapse" in event_types
    assert "capacity_reduction" in event_types