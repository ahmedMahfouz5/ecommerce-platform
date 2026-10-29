from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from alembic import script as alembic_script
from alembic.runtime import migration as alembic_migration
from app.config import settings

engine = create_async_engine(
    settings.database_url, echo=False, pool_size=5, max_overflow=10
)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncSession:
    """Yield an async database session."""
    async with async_session_factory() as session:
        yield session


async def check_database_connection() -> bool:
    """Check if the database is reachable by executing a simple query."""
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_migration_status() -> tuple[bool, str | None, str | None]:
    """Check whether all Alembic migrations have been applied.

    Returns:
        (up_to_date, current_revision, head_revision)
    """
    try:
        async with engine.connect() as conn:
            await conn.run_sync(_check_migration_sync)
            # If _check_migration_sync didn't raise, migrations are up to date
        return True, None, None
    except Exception as exc:
        msg = str(exc)
        # "db is ahead of head" means extra revisions exist — still "up to date" for our purposes
        if "ahead of head" in msg:
            return True, None, None
        return False, _extract_revision(msg, "current"), _extract_revision(msg, "head")


def _check_migration_sync(connection):
    """Synchronous helper that runs Alembic's migration check."""
    from alembic.config import Config
    from pathlib import Path

    # Locate alembic.ini relative to this file's package (backend/app/core/../../alembic.ini)
    alembic_ini = Path(__file__).resolve().parent.parent.parent / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))

    # Point script_location to the alembic directory
    scripts_dir = Path(__file__).resolve().parent.parent.parent / "alembic"
    alembic_cfg.set_main_option("script_location", str(scripts_dir))

    directory = alembic_script.ScriptDirectory.from_config(alembic_cfg)

    context = alembic_migration.MigrationContext.configure(connection)
    heads = directory.get_heads()
    current = context.get_current_revision()

    if current not in heads:
        raise Exception(
            f"Migration check failed: current={current}, head={heads[0] if heads else 'none'}"
        )


def _extract_revision(msg: str, label: str) -> str | None:
    """Try to pull a revision hash out of a message like 'current=abc123,...'."""
    for part in msg.split(","):
        part = part.strip()
        if part.startswith(f"{label}="):
            return part.split("=", 1)[1]
    return None
