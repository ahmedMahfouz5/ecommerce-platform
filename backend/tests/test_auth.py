"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport

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
# Module-level fixture: raw client without auth overrides
# ---------------------------------------------------------------------------


@pytest.fixture
async def raw_client(engine):
    """A test client WITHOUT the auth dependency override.

    Only the database session is overridden; auth dependencies
    (get_current_username, require_admin) run as in production.
    """
    from app.core.database import get_session
    from app.main import app
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_session():
        async with TestSessionLocal() as session:
            yield session

    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    app.dependency_overrides.update(saved)


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------


class TestRegister:
    """POST /api/v1/auth/register (customer registration)"""

    async def test_register_creates_customer_and_returns_token(self, client):
        """A new customer can register and receives a JWT token."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={"username": "newcustomer", "password": "password123"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["message"] == "Registration successful."
        assert data["user"]["username"] == "newcustomer"
        assert data["user"]["is_admin"] is False
        assert "id" in data["user"]
        assert set(data.keys()) == {
            "message",
            "user",
            "access_token",
            "token_type",
            "expires_in",
        }
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20
        assert data["expires_in"] > 0

    async def test_register_rejects_duplicate_username(self, client, engine):
        """Registering an existing username returns 409."""
        await _seed_user(engine, "taken", "secret")

        resp = await client.post(
            "/api/v1/auth/register",
            json={"username": "taken", "password": "password123"},
        )
        assert resp.status_code == 409
        assert "already taken" in resp.json()["detail"]

    async def test_register_rejects_short_password(self, client):
        """Password must be at least 8 characters."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={"username": "someone", "password": "short"},
        )
        assert resp.status_code == 422

    async def test_register_rejects_empty_username(self, client):
        """Username must not be empty."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={"username": "", "password": "password123"},
        )
        assert resp.status_code == 422

    async def test_registered_user_can_login(self, client):
        """A registered customer should be able to log in."""
        # Register
        await client.post(
            "/api/v1/auth/register",
            json={"username": "loginme", "password": "password123"},
        )

        # Login
        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "loginme", "password": "password123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_admin"] is False
        assert len(data["access_token"]) > 20

    async def test_registered_user_is_not_admin(self, raw_client):
        """A customer token cannot access admin-only endpoints."""
        # Register as customer
        reg_resp = await raw_client.post(
            "/api/v1/auth/register",
            json={"username": "customer1", "password": "password123"},
        )
        token = reg_resp.json()["access_token"]

        # Try creating a product – should be 403 because not admin
        resp = await raw_client.post(
            "/api/v1/products",
            json={
                "name": "Hack Product",
                "price": 9.99,
                "stock_quantity": 1,
                "category": "test",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
        assert "Admin privileges required" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# POST /api/v1/auth/admin/register
# ---------------------------------------------------------------------------


class TestAdminRegister:
    """POST /api/v1/auth/admin/register (admin-only registration)"""

    @pytest.fixture
    async def admin_token(self, client, engine):
        """Create an admin user and return a valid JWT token."""
        await _seed_user(engine, "superadmin", "adminpass", is_admin=True)

        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "superadmin", "password": "adminpass"},
        )
        return resp.json()["access_token"]

    async def test_admin_can_register_another_admin(self, client, engine, admin_token):
        """An admin can create another admin account."""
        resp = await client.post(
            "/api/v1/auth/admin/register",
            json={"username": "newadmin", "password": "adminpass123"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["username"] == "newadmin"
        assert data["user"]["is_admin"] is True
        assert len(data["access_token"]) > 20

    async def test_admin_register_returns_admin_token(
        self, client, engine, admin_token
    ):
        """A newly created admin receives a token with is_admin=True at login."""
        await client.post(
            "/api/v1/auth/admin/register",
            json={"username": "admin2", "password": "adminpass123"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        # Login as the new admin
        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin2", "password": "adminpass123"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_admin"] is True

    async def test_non_admin_cannot_register_admin(self, raw_client):
        """A customer token cannot create another admin."""
        # Register a customer via API
        reg_resp = await raw_client.post(
            "/api/v1/auth/register",
            json={"username": "plainuser", "password": "password123"},
        )
        customer_token = reg_resp.json()["access_token"]

        # Try to create an admin – should fail with 403
        resp = await raw_client.post(
            "/api/v1/auth/admin/register",
            json={"username": "wannabeadmin", "password": "adminpass123"},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert resp.status_code == 403
        assert "Admin privileges required" in resp.json()["detail"]

    async def test_admin_register_without_token_returns_401(self, raw_client):
        """Admin registration requires authentication."""
        resp = await raw_client.post(
            "/api/v1/auth/admin/register",
            json={"username": "nobody", "password": "adminpass123"},
        )
        assert resp.status_code == 401


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
        assert set(data.keys()) == {
            "access_token",
            "token_type",
            "expires_in",
            "is_admin",
        }
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20
        assert data["expires_in"] > 0
        assert data["is_admin"] is True

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
