#!/usr/bin/env python3
"""
Management script: create the first (or additional) admin user.

Usage:
  python scripts/create_admin.py <username> <password>   [--force]

  --force    If the user already exists, update password + ensure is_admin.

Environment variables (same as the app):
  DATABASE_URL   – asyncpg connection string (defaults to the app default).
  SECRET_KEY     – not used for password hashing but loaded by config anyway.
"""

import argparse
import asyncio
import os
import sys

# Ensure the backend package is importable when run from project root.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from app.config import settings
from app.core.database import async_session_factory
from app.modules.auth.models import User
from app.modules.auth.service import hash_password


async def _create_or_update_admin(
    username: str, password: str, force: bool
) -> None:
    """Create an admin user, or update an existing one if --force."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()

        if user is not None:
            if not force:
                print(
                    f"User '{username}' already exists. "
                    f"Use --force to update password and grant admin.",
                    file=sys.stderr,
                )
                sys.exit(1)

            user.hashed_password = hash_password(password)
            user.is_admin = True
            user.is_active = True
            await session.commit()
            print(f"User '{username}' updated (password reset, admin=True).")

        else:
            user = User(
                username=username,
                hashed_password=hash_password(password),
                is_active=True,
                is_admin=True,
            )
            session.add(user)
            await session.commit()
            print(f"Admin user '{username}' created.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update an admin user for the e-commerce platform."
    )
    parser.add_argument("username", help="Admin username")
    parser.add_argument("password", help="Admin password")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Update password and grant admin if the user already exists.",
    )
    args = parser.parse_args()

    asyncio.run(_create_or_update_admin(args.username, args.password, args.force))


if __name__ == "__main__":
    main()
