"""API routes for authentication.

Login returns a JWT access token.  Because we use stateless JWT there
is no real "logout" server-side; the logout endpoint exists for
symmetry but is a no-op (tokens become invalid when they expire, or
can be blacklisted in a future iteration).

Registration is available for customers (public) and admins (admin-only).
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import get_current_username, require_admin
from app.modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.modules.auth.service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)


def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)


# ---------------------------------------------------------------------------
# POST /register (customer – public)
# ---------------------------------------------------------------------------
@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    body: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Register a new customer account. This endpoint is public."""
    return await service.register(body, is_admin=False)


# ---------------------------------------------------------------------------
# POST /admin/register (admin – requires existing admin)
# ---------------------------------------------------------------------------
@router.post("/admin/register", response_model=RegisterResponse, status_code=201)
async def register_admin(
    body: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
    _admin: None = Depends(require_admin),
):
    """Register a new admin account. Requires an existing admin token."""
    return await service.register(body, is_admin=True)


# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Authenticate with username and password. Returns a JWT access token."""
    return await service.login(body)


# ---------------------------------------------------------------------------
# POST /logout
# ---------------------------------------------------------------------------
@router.post("/logout", status_code=204)
async def logout(
    _username: str = Depends(get_current_username),
):
    """Logout endpoint.

    Currently a no-op because JWTs are stateless. The client is
    responsible for discarding the token. A token blacklist can be
    added here in the future.
    """
