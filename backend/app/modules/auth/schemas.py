"""Pydantic schemas for auth request/response validation."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials sent by the client during login."""

    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    """Data sent by the client to create a new account."""

    username: str = Field(min_length=1, max_length=150)
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    """Token sent by the client to verify their email."""

    token: str = Field(min_length=1)


class ResendVerificationRequest(BaseModel):
    """Email address for resending verification."""

    email: EmailStr = Field(max_length=320)


class ForgotPasswordRequest(BaseModel):
    """Email address for initiating a password reset."""

    email: EmailStr = Field(max_length=320)


class ResetPasswordRequest(BaseModel):
    """Token and new password for completing a password reset."""

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    """JWT token returned on successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    is_admin: bool


class UserResponse(BaseModel):
    """Public user data returned after registration."""

    id: uuid.UUID
    username: str
    email: str | None = None
    is_admin: bool
    is_verified: bool = False
    verified_at: datetime | None = None

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    """Response returned after a successful registration."""

    message: str
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
