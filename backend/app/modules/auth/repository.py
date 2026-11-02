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
        result = await self._session.execute(select(User).where(User.email == email))
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

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Return a user by primary key, or None."""
        result = await self._session.get(User, user_id)
        return result

    async def list_users(self) -> list[User]:
        """Return all users ordered by creation date (newest first)."""
        result = await self._session.execute(
            select(User).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def add(self, user: User) -> User:
        """Persist a new user to the database."""
        self._session.add(user)
        await self._session.flush()
        return user

    async def delete(self, user: User) -> None:
        """Delete a user from the database."""
        await self._session.delete(user)
        await self._session.flush()
