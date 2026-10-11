"""Shared pytest fixtures for the e-commerce test suite."""

import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.main import app
from app.models import Base

TEST_SCHEMA = "test_schema"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a test database engine and initialise the test schema.

    The schema is created once per session and dropped afterwards.
    Each test function gets its own transaction via ``db_session`` so that
    changes can be rolled back independently.
    """
    engine = create_async_engine(
        settings.database_url, echo=False, pool_size=20, max_overflow=20
    )

    # Ensure a clean starting point
    async with engine.begin() as conn:
        await conn.execute(text(f"DROP SCHEMA IF EXISTS {TEST_SCHEMA} CASCADE"))
        await conn.execute(text(f"CREATE SCHEMA {TEST_SCHEMA}"))

    # Create tables inside the test schema
    async with engine.begin() as conn:
        await conn.execute(text(f"SET search_path TO {TEST_SCHEMA}"))
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Tear down
    async with engine.begin() as conn:
        await conn.execute(text(f"DROP SCHEMA IF EXISTS {TEST_SCHEMA} CASCADE"))

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session scoped to ``test_schema``.

    Opens a dedicated connection, begins a transaction, and creates a session
    bound to it.  The ``client`` fixture will share this connection with the
    service layer so all work is rolled back.
    """
    async with test_engine.connect() as connection:
        await connection.execute(text(f"SET search_path TO {TEST_SCHEMA}"))
        await connection.commit()

        # Begin a transaction that we will roll back in teardown.
        # No work is ever committed to the database for real.
        trans = await connection.begin()

        # Session bound exclusively to this connection/transaction.
        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        # Stash the shared connection so the client fixture can find it.
        # Use the SQLAlchemy internals – AsyncSession stores its bind.
        session._test_connection = connection  # type: ignore[attr-defined]

        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest_asyncio.fixture
async def client(db_session, test_engine) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP test client wired to the isolated test database.

    The ``async_session_factory`` used by the service layer is replaced so
    that every HTTP request gets a fresh session that shares the same
    underlying connection as ``db_session``.  This means all writes are
    visible within the test but rolled back afterwards.
    """

    from app.core import database as db_module

    # Grab the shared connection from db_session.
    connection = db_session._test_connection  # type: ignore[attr-defined]

    original_factory = db_module.async_session_factory
    db_module.async_session_factory = _SessionCtxFactory(connection)

    async def override_get_session():
        async with _SessionCtxFactory(connection)() as session:
            yield session

    app.dependency_overrides[db_module.get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    db_module.async_session_factory = original_factory


class _SessionCtxFactory:
    """Callable that returns a context manager yielding a fresh session
    that participates in the test's transaction."""

    def __init__(self, connection):
        self._connection = connection

    def __call__(self):
        return _SessionCtx(self._connection)


class _SessionCtx:
    """Async context manager that creates a new Session bound to the
    shared test connection with `join_transaction_mode="create_savepoint"`,
    so the service layer's ``commit()`` only creates/commits a savepoint,
    never the real transaction."""

    def __init__(self, connection):
        self._connection = connection
        self._session: AsyncSession | None = None

    async def __aenter__(self):
        self._session = AsyncSession(
            bind=self._connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        return self._session

    async def __aexit__(self, *args):
        if self._session is not None:
            await self._session.close()
            self._session = None


def unique_product_data(**overrides) -> dict:
    """Return valid product creation data with a unique name."""
    uid = uuid.uuid4().hex[:8]
    return {
        "name": f"Test Product {uid}",
        "description": f"Description for {uid}",
        "price": 19.99,
        "stock_quantity": 42,
        "category": "Test Category",
        "image_url": f"https://example.com/{uid}.jpg",
    } | overrides


async def create_product(client: AsyncClient, **overrides) -> dict:
    """Helper to create a product via the API and return the JSON response."""
    data = unique_product_data(**overrides)
    response = await client.post("/api/v1/products", json=data)
    assert response.status_code == 201, response.text
    return response.json()
