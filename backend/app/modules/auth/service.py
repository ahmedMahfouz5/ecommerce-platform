"""Business logic for authentication (password hashing, JWT, email verification)."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResendVerificationRequest,
    MessageResponse,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.email import EmailService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Password hashing – bcrypt via passlib
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
VERIFICATION_TOKEN_EXPIRE_HOURS = 24
RESET_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check *plain* against the stored bcrypt *hashed* value."""
    return _pwd_context.verify(plain, hashed)


def _generate_token() -> str:
    """Generate a cryptographically secure URL-safe token."""
    return secrets.token_urlsafe(32)


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
    """Service layer for authentication and account management."""

    def __init__(self, session: AsyncSession, email_service: EmailService) -> None:
        self.session = session
        self.email = email_service

    # -----------------------------------------------------------------------
    # POST /register
    # -----------------------------------------------------------------------

    async def register(
        self, data: RegisterRequest, *, is_admin: bool = False
    ) -> RegisterResponse:
        """Register a new user account and send a verification email.

        By default, new users are customers (is_admin=False). Only an existing
        admin can create another admin account.

        Raises:
            HTTPException 409: username or email already taken.
        """
        repo = UserRepository(self.session)

        existing = await repo.get_by_username(data.username)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{data.username}' is already taken.",
            )

        existing_email = await repo.get_by_email(data.email)
        if existing_email is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{data.email}' is already registered.",
            )

        verification_token = _generate_token()
        verification_token_expires = datetime.now(timezone.utc) + timedelta(
            hours=VERIFICATION_TOKEN_EXPIRE_HOURS
        )

        user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            is_active=True,
            is_admin=is_admin,
            is_verified=False,
            verification_token=verification_token,
            verification_token_expires_at=verification_token_expires,
        )
        await repo.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        # Send verification email (non-blocking – failures are logged, not raised)
        await self.email.send_verification_email(
            to_email=user.email,
            username=user.username,
            token=verification_token,
        )

        logger.info(
            "New user registered: username=%s, email=%s, is_admin=%s",
            user.username,
            user.email,
            user.is_admin,
        )

        return RegisterResponse(
            message=(
                "Registration successful. Please check your email for a "
                "verification link to activate your account."
            ),
            user=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                is_admin=user.is_admin,
                is_verified=user.is_verified,
            ),
        )

    # -----------------------------------------------------------------------
    # POST /verify-email
    # -----------------------------------------------------------------------

    async def verify_email(
        self, data: VerifyEmailRequest
    ) -> MessageResponse:
        """Verify a user's email address using the verification token.

        Raises:
            HTTPException 400: invalid or expired verification token.
        """
        repo = UserRepository(self.session)
        user = await repo.get_by_verification_token(data.token)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token.",
            )

        if user.is_verified:
            return MessageResponse(message="Email already verified.")

        now = datetime.now(timezone.utc)
        if (
            user.verification_token_expires_at is None
            or user.verification_token_expires_at < now
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new one.",
            )

        user.is_verified = True
        user.verified_at = datetime.now(timezone.utc)
        user.verification_token = None
        user.verification_token_expires_at = None
        await self.session.commit()

        logger.info("User verified: username=%s", user.username)

        return MessageResponse(message="Email verified successfully. You may now log in.")

    # -----------------------------------------------------------------------
    # POST /resend-verification
    # -----------------------------------------------------------------------

    async def resend_verification(
        self, data: ResendVerificationRequest
    ) -> MessageResponse:
        """Resend a verification email with a fresh token.

        Raises:
            HTTPException 404: email not found.
        """
        repo = UserRepository(self.session)
        user = await repo.get_by_email(data.email)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address.",
            )

        if user.is_verified:
            return MessageResponse(message="Account is already verified. You may log in.")

        verification_token = _generate_token()
        verification_token_expires = datetime.now(timezone.utc) + timedelta(
            hours=VERIFICATION_TOKEN_EXPIRE_HOURS
        )

        user.verification_token = verification_token
        user.verification_token_expires_at = verification_token_expires
        await self.session.commit()

        # Send the new verification email
        await self.email.send_verification_email(
            to_email=user.email,
            username=user.username,
            token=verification_token,
        )

        logger.info(
            "Verification email re-sent: username=%s, email=%s",
            user.username,
            user.email,
        )

        return MessageResponse(
            message="A new verification email has been sent. Please check your inbox."
        )

    # -----------------------------------------------------------------------
    # POST /forgot-password
    # -----------------------------------------------------------------------

    async def forgot_password(
        self, data: ForgotPasswordRequest
    ) -> MessageResponse:
        """Generate a password reset token and send it via email.

        Always returns the same success message regardless of whether the
        email exists, to prevent email enumeration.

        Raises:
            HTTPException 400: account not verified.
        """
        repo = UserRepository(self.session)
        user = await repo.get_by_email(data.email)

        if user is None:
            return MessageResponse(
                message="If an account with that email exists, a password reset "
                "link has been sent."
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account must be verified before resetting password. "
                "Please verify your email first.",
            )

        reset_token = _generate_token()
        reset_token_expires = datetime.now(timezone.utc) + timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        )

        user.reset_token = reset_token
        user.reset_token_expires_at = reset_token_expires
        await self.session.commit()

        # Send the password reset email
        await self.email.send_password_reset_email(
            to_email=user.email,
            username=user.username,
            token=reset_token,
        )

        logger.info(
            "Password reset requested: username=%s, email=%s",
            user.username,
            user.email,
        )

        return MessageResponse(
            message="If an account with that email exists, a password reset "
            "link has been sent."
        )

    # -----------------------------------------------------------------------
    # POST /reset-password
    # -----------------------------------------------------------------------

    async def reset_password(
        self, data: ResetPasswordRequest
    ) -> MessageResponse:
        """Reset the user's password using the reset token.

        Raises:
            HTTPException 400: invalid or expired reset token.
        """
        repo = UserRepository(self.session)
        user = await repo.get_by_reset_token(data.token)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token.",
            )

        now = datetime.now(timezone.utc)
        if (
            user.reset_token_expires_at is None
            or user.reset_token_expires_at < now
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired. Please request a new one.",
            )

        user.hashed_password = hash_password(data.new_password)
        user.reset_token = None
        user.reset_token_expires_at = None
        await self.session.commit()

        logger.info("Password reset completed: username=%s", user.username)

        return MessageResponse(message="Password has been reset successfully. You may now log in.")

    # -----------------------------------------------------------------------
    # POST /login
    # -----------------------------------------------------------------------

    async def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate a user and return a JWT access token.

        Only verified accounts are allowed to log in.

        Raises:
            HTTPException 401: invalid credentials, inactive user, or
                              unverified account.
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

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not verified. Please verify your email before logging in.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(sub=user.username, is_admin=user.is_admin)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            is_admin=user.is_admin,
        )
