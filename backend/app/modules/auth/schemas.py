"""Pydantic schemas for auth request/response validation."""

import uuid

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Credentials sent by the client during login."""

    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    """Data sent by the client to create a new account."""

    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=8, max_length=128)


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
    is_admin: bool

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    """Response returned after a successful registration."""

    message: str
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    expires_in: int
