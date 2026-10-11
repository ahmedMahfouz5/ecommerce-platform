"""Shared pytest fixtures for the e-commerce test suite.

Isolation strategy:
- alembic migrations run once per session against *TEST_DATABASE_URL*.
- Each test function gets a fresh async engine (NullPool) with TRUNCATE
  before and after.
- app.dependency_overrides replaces get_session with a session maker
  bound to the test engine.
"""

import os
import subprocess
import sys

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# ---- Resolve the target test database URL --------------------------------

from app.config import settings as app_settings

DEV_DATABASE_URL = app_settings.database_url

_TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if _TEST_DATABASE_URL:
    TEST_DATABASE_URL = _TEST_DATABASE_URL
else:
    url = make_url(DEV_DATABASE_URL)
    url = url.set(database="ecommerce_test")
    TEST_DATABASE_URL = url.render_as_string(hide_password=False)

# ---- Safety guard ---------------------------------------------------------

if TEST_DATABASE_URL == DEV_DATABASE_URL:
    pytest.exit(
        "TEST_DATABASE_URL is the same as the development DATABASE_URL. "
        "Refusing to run tests – this would destroy dev data."
    )

_db_name = make_url(TEST_DATABASE_URL).database
if not _db_name or not _db_name.endswith("_test"):
    pytest.exit(
        f"TEST_DATABASE_URL points to database '{_db_name}', "
        f"which does not end with '_test'. Refusing to run."
    )


@pytest.fixture(scope="session", autouse=True)
def _run_migrations():
    """Run alembic upgrades on the test database once per test session.

    Uses a subprocess so that alembic/env.py reads the test URL from its
    environment.
    """
    env = os.environ.copy()
    env["DATABASE_URL"] = TEST_DATABASE_URL

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=os.path.join(os.path.dirname(__file__), ".."),
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.fail(f"alembic upgrade head failed:\n{result.stderr}")


@pytest_asyncio.fixture
async def engine():
    """Function-scoped async engine (NullPool) against the test database.

    TRUNCATE on setup ensures a clean starting state.
    TRUNCATE on teardown leaves the database empty for the next test.
    """
    eng = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)

    async with eng.begin() as conn:
        await conn.execute(
            text("TRUNCATE TABLE products RESTART IDENTITY CASCADE")
        )

    yield eng

    async with eng.begin() as conn:
        await conn.execute(
            text("TRUNCATE TABLE products RESTART IDENTITY CASCADE")
        )
    await eng.dispose()


@pytest_asyncio.fixture
async def client(engine):
    """Function-scoped async HTTP test client.

    Overrides get_session so every request uses a fresh session from the
    test engine.  The session factory mirrors production:
    expire_on_commit=False.
    """
    from app.core.database import get_session
    from app.main import app

    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_session():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
