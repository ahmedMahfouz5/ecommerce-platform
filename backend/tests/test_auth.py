"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient

from app.modules.auth.service import hash_password

pytestmark = pytest.mark.asyncio

# ---------------------------------------------------------------------------
# Helper: seed a user directly in the test DB (bypasses the API)
# ---------------------------------------------------------------------------


async def _seed_user(engine, username: str, password: str, *, is_admin: bool = True):
    """Insert a user directly into the test database using raw SQL."""
    from sqlalchemy import text

    hashed = hash_password(password)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, username, hashed_password, is_active, is_admin, created_at, updated_at) "
                "VALUES (gen_random_uuid(), :username, :hashed, TRUE, :is_admin, NOW(), NOW())"
            ),
            {"username": username, "hashed": hashed, "is_admin": is_admin},
        )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    """POST /api/v1/auth/login"""

    async def test_login_returns_token_for_valid_credentials(self, client, engine):
        """A valid username+password returns a JWT access token."""
        await _seed_user(engine, "admin", "secret")

        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "secret"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert set(data.keys()) == {"access_token", "token_type", "expires_in"}
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20
        assert data["expires_in"] > 0

    async def test_login_rejects_wrong_password(self, client, engine):
        """Wrong password returns 401."""
        await _seed_user(engine, "admin", "secret")

        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert resp.status_code == 401
        assert "Invalid username or password" in resp.json()["detail"]

    async def test_login_rejects_nonexistent_user(self, client):
        """A username that doesn't exist returns 401."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "nobody", "password": "secret"},
        )
        assert resp.status_code == 401
        assert "Invalid username or password" in resp.json()["detail"]

    async def test_login_rejects_inactive_user(self, client, engine):
        """An inactive user returns 401."""
        from sqlalchemy import text

        await _seed_user(engine, "disabled", "secret")
        # Deactivate the user
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE users SET is_active = FALSE WHERE username = 'disabled'")
            )

        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "disabled", "password": "secret"},
        )
        assert resp.status_code == 401
        assert "disabled" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# POST /api/v1/auth/logout
# ---------------------------------------------------------------------------


class TestLogout:
    """POST /api/v1/auth/logout"""

    async def test_logout_with_valid_token_returns_204(self, client, engine):
        """Logout with a valid bearer token returns 204 and discards session."""
        await _seed_user(engine, "admin", "secret")

        # Login to get a token
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "secret"},
        )
        token = login_resp.json()["access_token"]

        # Logout
        resp = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 204

    async def test_logout_without_token_returns_401(self, client):
        """Logout without an Authorization header returns 401."""
        resp = await client.post("/api/v1/auth/logout")
        assert resp.status_code == 401

    async def test_logout_with_invalid_token_returns_401(self, client):
        """Logout with a malformed token returns 401."""
        resp = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": "Bearer garbage"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Protected endpoints reject requests without valid tokens
# ---------------------------------------------------------------------------


class TestAuthRequiredOnWriteEndpoints:
    """Verify that product write endpoints are protected."""

    # These tests use the raw client WITHOUT the auth dependency override.
    # We recreate the test client locally to avoid the override.

    @pytest.fixture
    async def raw_client(self, engine):
        """A test client WITHOUT the auth dependency override."""
        from app.core.database import get_session
        from app.main import app
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

        TestSessionLocal = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async def override_get_session():
            async with TestSessionLocal() as session:
                yield session

        # Save old overrides, clear them, and apply only the session override
        saved = dict(app.dependency_overrides)
        app.dependency_overrides.clear()
        app.dependency_overrides[get_session] = override_get_session

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

        # Restore original overrides
        app.dependency_overrides.clear()
        app.dependency_overrides.update(saved)

    async def test_create_product_requires_auth(self, raw_client):
        """POST /products without a token returns 401."""
        resp = await raw_client.post(
            "/api/v1/products",
            json={
                "name": "Test",
                "price": 9.99,
                "stock_quantity": 1,
                "category": "test",
            },
        )
        assert resp.status_code == 401

    async def test_update_product_requires_auth(self, raw_client):
        """PUT /products/{id} without a token returns 401."""
        resp = await raw_client.put(
            "/api/v1/products/00000000-0000-0000-0000-000000000000",
            json={"name": "Updated"},
        )
        assert resp.status_code == 401

    async def test_delete_product_requires_auth(self, raw_client):
        """DELETE /products/{id} without a token returns 401."""
        resp = await raw_client.delete(
            "/api/v1/products/00000000-0000-0000-0000-000000000000",
        )
        assert resp.status_code == 401

    async def test_image_upload_url_requires_auth(self, raw_client):
        """POST /products/{id}/images/upload-url without a token returns 401."""
        resp = await raw_client.post(
            "/api/v1/products/00000000-0000-0000-0000-000000000000/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 100},
        )
        assert resp.status_code == 401

    async def test_image_confirm_requires_auth(self, raw_client):
        """PUT /products/{id}/images/confirm without a token returns 401."""
        resp = await raw_client.put(
            "/api/v1/products/00000000-0000-0000-0000-000000000000/images/confirm",
            json={"object_key": "products/uuid/foo.jpg"},
        )
        assert resp.status_code == 401
