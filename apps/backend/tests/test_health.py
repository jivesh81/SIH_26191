"""
Tests for health endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test /health endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Aapda Setu API"
    assert data["version"] == "0.1.0"
    assert data["data_mode"] == "local_synthetic_demo"


@pytest.mark.asyncio
async def test_readiness_check(client: AsyncClient):
    """Test /ready endpoint."""
    response = await client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["service"] == "Aapda Setu API"


@pytest.mark.asyncio
async def test_api_v1_health(client: AsyncClient):
    """Test /api/v1/health endpoint."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Aapda Setu API"