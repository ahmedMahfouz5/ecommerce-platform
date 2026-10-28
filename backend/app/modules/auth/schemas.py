"""Pydantic schemas for auth request/response validation."""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Credentials sent by the client during login."""

    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """JWT token returned on successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
