"""Tests for the health-check endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestHealthLegacy:
    """GET /api/v1/health"""

    async def test_returns_200(self, client: AsyncClient):
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestLiveness:
    """GET /api/v1/health/live"""

    async def test_returns_200(self, client: AsyncClient):
        response = await client.get("/api/v1/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestReadiness:
    """GET /api/v1/health/ready"""

    async def test_returns_200_when_db_connected(self, client: AsyncClient):
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"

    async def test_returns_503_when_db_disconnected(self, client: AsyncClient):
        with patch(
            "app.routers.health.check_database_connection",
            new_callable=AsyncMock,
        ) as mock_check:
            mock_check.return_value = False

            response = await client.get("/api/v1/health/ready")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "error"
            assert data["database"] == "disconnected"
