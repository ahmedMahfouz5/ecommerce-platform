#!/usr/bin/env python3
"""
Management script: create a user (admin or customer).

Usage:
  python scripts/create_user.py <username> <password> [--admin] [--force]

  --admin    Create the user with admin privileges (default: customer).
  --force    If the user already exists, update password and privilege level.

Examples:
  python scripts/create_user.py customer1 pass123          # customer
  python scripts/create_user.py admin1 pass123 --admin     # admin
  python scripts/create_user.py existing pass123 --admin --force

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


async def _create_or_update_user(
    username: str, password: str, is_admin: bool, force: bool
) -> None:
    """Create a user, or update an existing one if --force."""
    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()

        role = "admin" if is_admin else "customer"

        if user is not None:
            if not force:
                print(
                    f"User '{username}' already exists. "
                    f"Use --force to update password and role.",
                    file=sys.stderr,
                )
                sys.exit(1)

            user.hashed_password = hash_password(password)
            user.is_admin = is_admin
            user.is_active = True
            await session.commit()
            print(f"User '{username}' updated (password reset, is_admin={is_admin}).")

        else:
            user = User(
                username=username,
                hashed_password=hash_password(password),
                is_active=True,
                is_admin=is_admin,
            )
            session.add(user)
            await session.commit()
            print(f"{role.capitalize()} user '{username}' created.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update a user for the e-commerce platform."
    )
    parser.add_argument("username", help="Username")
    parser.add_argument("password", help="Password")
    parser.add_argument(
        "--admin",
        action="store_true",
        help="Grant admin privileges to the user.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Update password and role if the user already exists.",
    )
    args = parser.parse_args()

    asyncio.run(
        _create_or_update_user(args.username, args.password, args.admin, args.force)
    )


if __name__ == "__main__":
    main()
