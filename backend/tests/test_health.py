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

    @pytest.fixture(autouse=True)
    def _mock_migrations(self):
        """Every readiness test gets a passing migration check by default."""
        with patch(
            "app.routers.health.check_migration_status",
            new_callable=AsyncMock,
        ) as mock:
            mock.return_value = (True, None, None)
            yield mock

    async def test_returns_200_when_all_healthy(self, client: AsyncClient):
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert data["migrations"] == "up_to_date"

    async def test_returns_503_when_db_disconnected(self, client: AsyncClient):
        with patch(
            "app.routers.health.check_database_connection",
            new_callable=AsyncMock,
        ) as mock_db:
            mock_db.return_value = False

            response = await client.get("/api/v1/health/ready")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "error"
            assert "database: disconnected" in data["checks"]

    async def test_returns_503_when_migrations_incomplete(self, client: AsyncClient):
        with patch(
            "app.routers.health.check_migration_status",
            new_callable=AsyncMock,
        ) as mock_mig:
            mock_mig.return_value = (False, "abc123", "def456")

            response = await client.get("/api/v1/health/ready")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "error"
            assert any("migration: incomplete" in c for c in data["checks"])

    async def test_returns_503_when_both_fail(self, client: AsyncClient):
        with (
            patch(
                "app.routers.health.check_database_connection",
                new_callable=AsyncMock,
            ) as mock_db,
            patch(
                "app.routers.health.check_migration_status",
                new_callable=AsyncMock,
            ) as mock_mig,
        ):
            mock_db.return_value = False
            mock_mig.return_value = (False, "abc123", "def456")

            response = await client.get("/api/v1/health/ready")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "error"
            assert len(data["checks"]) == 2
            assert "database: disconnected" in data["checks"]
            assert any("migration: incomplete" in c for c in data["checks"])


class TestDbConnection:
    """GET /api/v1/health/db_connection"""

    async def test_returns_200_when_connected(self, client: AsyncClient):
        response = await client.get("/api/v1/health/db_connection")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"

    async def test_returns_503_when_disconnected(self, client: AsyncClient):
        with patch(
            "app.routers.health.check_database_connection",
            new_callable=AsyncMock,
        ) as mock_db:
            mock_db.return_value = False

            response = await client.get("/api/v1/health/db_connection")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "error"
            assert data["database"] == "disconnected"


class TestDbMigration:
    """GET /api/v1/health/db_migration"""

    @pytest.fixture(autouse=True)
    def _mock_migrations(self):
        with patch(
            "app.routers.health.check_migration_status",
            new_callable=AsyncMock,
        ) as mock:
            mock.return_value = (True, None, None)
            yield mock

    async def test_returns_200_when_up_to_date(self, client: AsyncClient):
        response = await client.get("/api/v1/health/db_migration")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["migration"] == "up_to_date"

    async def test_returns_503_when_incomplete(self, client: AsyncClient):
        with patch(
            "app.routers.health.check_migration_status",
            new_callable=AsyncMock,
        ) as mock_mig:
            mock_mig.return_value = (False, "abc123", "def456")

            response = await client.get("/api/v1/health/db_migration")

            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "error"
            assert data["migration"] == "incomplete"
            assert data["current_revision"] == "abc123"
            assert data["head_revision"] == "def456"
