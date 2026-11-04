"""Async MongoDB client for product data."""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)
_mongo_client: AsyncIOMotorClient | None = None


async def get_mongodb() -> AsyncIOMotorDatabase:
    """Return the ecommerce MongoDB database."""
    global _mongo_client  # noqa: PLW0603
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.mongodb_url)
    return _mongo_client.get_default_database()


async def close_mongodb() -> None:
    """Close the MongoDB client if it was opened."""
    global _mongo_client  # noqa: PLW0603
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None


async def check_mongodb_connection() -> bool:
    """Check whether the MongoDB server is reachable."""
    try:
        db = await get_mongodb()
        await db.command("ping")
        return True
    except Exception as exc:
        logger.exception("MongoDB health check failed: %s", exc)
        return False
