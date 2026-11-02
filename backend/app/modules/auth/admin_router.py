"""Admin-only endpoints for user management."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_session
from app.modules.auth.dependencies import require_admin
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import (
    MessageResponse,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        is_verified=user.is_verified,
        verified_at=user.verified_at,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    _admin: User = Depends(require_admin),
    session=Depends(get_session),
):
    """List all registered users. Admin only."""
    repo = UserRepository(session)
    users = await repo.list_users()
    return UserListResponse(users=[_user_to_response(u) for u in users])


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdateRequest,
    _admin: User = Depends(require_admin),
    session=Depends(get_session),
):
    """Update a user's details. Admin only."""
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if body.username is not None and body.username != user.username:
        existing = await repo.get_by_username(body.username)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{body.username}' is already taken.",
            )
        user.username = body.username

    if body.email is not None and body.email != user.email:
        existing = await repo.get_by_email(body.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{body.email}' is already registered.",
            )
        user.email = body.email

    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_verified is not None:
        user.is_verified = body.is_verified
        if body.is_verified and user.verified_at is None:
            from datetime import datetime, timezone

            user.verified_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(user)
    return _user_to_response(user)


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    session=Depends(get_session),
):
    """Delete a user. Admin only."""
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    await repo.delete(user)
    await session.commit()

    return MessageResponse(message=f"User '{user.username}' deleted successfully.")
