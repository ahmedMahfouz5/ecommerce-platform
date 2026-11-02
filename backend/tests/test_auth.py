"""Tests for authentication endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.modules.auth.service import hash_password

pytestmark = pytest.mark.asyncio

# ---------------------------------------------------------------------------
# Helper: seed a verified user directly in the test DB (bypasses the API)
# ---------------------------------------------------------------------------


async def _seed_user(
    engine,
    username: str,
    password: str,
    *,
    email: str = "user@example.com",
    is_admin: bool = True,
    is_verified: bool = True,
):
    """Insert a verified user directly into the test database using raw SQL."""
    from sqlalchemy import text

    hashed = hash_password(password)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, username, email, hashed_password, is_active, is_admin, "
                "is_verified, verification_token, verification_token_expires_at, "
                "reset_token, reset_token_expires_at, created_at, updated_at) "
                "VALUES (gen_random_uuid(), :username, :email, :hashed, TRUE, :is_admin, "
                ":is_verified, NULL, NULL, NULL, NULL, NOW(), NOW())"
            ),
            {
                "username": username,
                "email": email,
                "hashed": hashed,
                "is_admin": is_admin,
                "is_verified": is_verified,
            },
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

    async def test_register_creates_customer(self, client):
        """A new customer can register and receives a verification message."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "newcustomer",
                "email": "customer@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "verification" in data["message"].lower()
        assert data["user"]["username"] == "newcustomer"
        assert data["user"]["email"] == "customer@example.com"
        assert data["user"]["is_admin"] is False
        assert data["user"]["is_verified"] is False
        assert "id" in data["user"]
        # Registration no longer returns a token – must verify first
        assert "access_token" not in data

    async def test_register_rejects_duplicate_username(self, client, engine):
        """Registering an existing username returns 409."""
        await _seed_user(engine, "taken", "secret", email="taken@example.com")

        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "taken",
                "email": "other@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 409
        assert "already taken" in resp.json()["detail"]

    async def test_register_rejects_duplicate_email(self, client, engine):
        """Registering an existing email returns 409."""
        await _seed_user(engine, "user1", "secret", email="dup@example.com")

        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "user2",
                "email": "dup@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"]

    async def test_register_rejects_short_password(self, client):
        """Password must be at least 8 characters."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "someone",
                "email": "someone@example.com",
                "password": "short",
            },
        )
        assert resp.status_code == 422

    async def test_register_rejects_empty_username(self, client):
        """Username must not be empty."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "",
                "email": "test@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 422

    async def test_register_rejects_invalid_email(self, client):
        """Email must be valid."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "someone",
                "email": "not-an-email",
                "password": "password123",
            },
        )
        assert resp.status_code == 422

    async def test_unverified_user_cannot_login(self, raw_client):
        """An unverified customer cannot log in."""
        # Register
        await raw_client.post(
            "/api/v1/auth/register",
            json={
                "username": "unverified",
                "email": "unverified@example.com",
                "password": "password123",
            },
        )

        # Try to login – should fail because not verified
        resp = await raw_client.post(
            "/api/v1/auth/login",
            json={"username": "unverified", "password": "password123"},
        )
        assert resp.status_code == 401
        assert "not verified" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# POST /api/v1/auth/verify-email
# ---------------------------------------------------------------------------


class TestVerifyEmail:
    """POST /api/v1/auth/verify-email"""

    async def test_verify_email_succeeds_with_valid_token(self, raw_client, engine):
        """Verifying with a valid token marks the user as verified."""
        # Register a user
        resp = await raw_client.post(
            "/api/v1/auth/register",
            json={
                "username": "verifyuser",
                "email": "verify@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 201

        # Get the verification token from the DB
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        TestSessionLocal = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with TestSessionLocal() as session:
            result = await session.execute(
                text(
                    "SELECT verification_token FROM users WHERE username = 'verifyuser'"
                )
            )
            token = result.scalar_one()

        # Verify with the token
        resp = await raw_client.post(
            "/api/v1/auth/verify-email",
            json={"token": token},
        )
        assert resp.status_code == 200
        assert "verified successfully" in resp.json()["message"].lower()

    async def test_verify_email_rejects_invalid_token(self, raw_client):
        """An invalid token returns 400."""
        resp = await raw_client.post(
            "/api/v1/auth/verify-email",
            json={"token": "invalid-token-that-does-not-exist"},
        )
        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower()

    async def test_verified_user_can_login_after_verification(self, raw_client):
        """After verification, the user can log in."""
        # Register
        await raw_client.post(
            "/api/v1/auth/register",
            json={
                "username": "loginlater",
                "email": "loginlater@example.com",
                "password": "password123",
            },
        )

        # Get the token and verify
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

        TestSessionLocal = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with TestSessionLocal() as session:
            result = await session.execute(
                text(
                    "SELECT verification_token FROM users WHERE username = 'loginlater'"
                )
            )
            token = result.scalar_one()

        await raw_client.post(
            "/api/v1/auth/verify-email",
            json={"token": token},
        )

        # Login should now succeed
        resp = await raw_client.post(
            "/api/v1/auth/login",
            json={"username": "loginlater", "password": "password123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["access_token"]) > 20


# -----------------------------------------------------------