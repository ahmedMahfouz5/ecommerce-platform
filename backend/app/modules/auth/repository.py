"""Data-access layer for User entities."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User


class UserRepository:
    """Async repository for User lookups and persistence."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_username(self, username: str) -> User | None:
        """Return a user by username (case-sensitive), or None."""
        result = await self._session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Return a user by email (case-insensitive), or None."""
        result = await self._session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_verification_token(self, token: str) -> User | None:
        """Return a user by their verification token, or None."""
        result = await self._session.execute(
            select(User).where(User.verification_token == token)
        )
        return result.scalar_one_or_none()

    async def get_by_reset_token(self, token: str) -> User | None:
        """Return a user by their password reset token, or None."""
        result = await self._session.execute(
            select(User).where(User.reset_token == token)
        )
        return result.scalar_one_or_none()

    async def add(self, user: User) -> User:
        """Persist a new user to the database."""
        self._session.add(user)
        await self._session.flush()
        return user
