"""Business logic for authentication (password hashing, JWT)."""

import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Password hashing – bcrypt via passlib
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check *plain* against the stored bcrypt *hashed* value."""
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------


def create_access_token(
    *, sub: str, is_admin: bool = False, expires_in: int | None = None
) -> str:
    """Create a signed JWT for *sub* (username).

    The token includes:
      - sub:      username
      - is_admin: whether the user has admin privileges
      - iat:      issued-at timestamp
      - exp:      expiration timestamp
      - type:     "access"
    """
    now = datetime.now(timezone.utc)
    expire_minutes = expires_in or ACCESS_TOKEN_EXPIRE_MINUTES
    payload = {
        "sub": sub,
        "is_admin": is_admin,
        "iat": now.timestamp(),
        "exp": now.timestamp() + (expire_minutes * 60),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Validate and decode a JWT.

    Raises:
        HTTPException 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# Auth service
# ---------------------------------------------------------------------------


class AuthService:
    """Service layer for login/logout and token operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def register(
        self, data: RegisterRequest, *, is_admin: bool = False
    ) -> RegisterResponse:
        """Register a new user account.

        By default, new users are customers (is_admin=False). Only an existing
        admin can create another admin account.

        Raises:
            HTTPException 409: username already taken.
        """
        repo = UserRepository(self.session)

        existing = await repo.get_by_username(data.username)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{data.username}' is already taken.",
            )

        user = User(
            username=data.username,
            hashed_password=hash_password(data.password),
            is_active=True,
            is_admin=is_admin,
        )
        await repo.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        access_token = create_access_token(sub=user.username, is_admin=user.is_admin)

        logger.info(
            "New user registered: username=%s, is_admin=%s",
            user.username,
            user.is_admin,
        )

        return RegisterResponse(
            message="Registration successful.",
            user=UserResponse(
                id=user.id,
                username=user.username,
                is_admin=user.is_admin,
            ),
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate a user and return a JWT access token.

        Raises:
            HTTPException 401: invalid credentials or inactive user.
        """
        repo = UserRepository(self.session)
        user = await repo.get_by_username(data.username)

        if user is None or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(sub=user.username, is_admin=user.is_admin)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            is_admin=user.is_admin,
        )
