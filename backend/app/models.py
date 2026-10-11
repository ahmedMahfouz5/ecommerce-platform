"""Shared SQLAlchemy declarative base for all modules.

All module models must inherit from this Base so that Alembic
can discover them through Base.metadata.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass