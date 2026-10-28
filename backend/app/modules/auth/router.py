"""API routes for authentication.

Login returns a JWT access token.  Because we use stateless JWT there
is no real "logout" server-side; the logout endpoint exists for
symmetry but is a no-op (tokens become invalid when they expire, or
can be blacklisted in a future iteration).
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import get_current_username
from app.modules.auth.schemas import LoginRequest, TokenResponse
from app.modules.auth.service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)


def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Authenticate with username and password. Returns a JWT access token."""
    return await service.login(body)


@router.post("/logout", status_code=204)
async def logout(
    _username: str = Depends(get_current_username),
):
    """Logout endpoint.

    Currently a no-op because JWTs are stateless. The client is
    responsible for discarding the token. A token blacklist can be
    added here in the future.
    """
