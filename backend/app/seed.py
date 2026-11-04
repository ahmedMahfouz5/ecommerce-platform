"""Seed MongoDB products from a JSON file at application startup.

The seeder is intentionally conservative: it only inserts products when the
``products`` collection is empty, so repeated restarts are idempotent.

It expects a JSON file with a top-level ``products`` array::

    {
        "products": [
            {"title": "Apples", "price": 1.6, ...},
            ...
        ]
    }
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.products.models import Product

logger = logging.getLogger(__name__)

DEFAULT_SEED_PATH = (
    Path(__file__).resolve().parent.parent / "seed_data" / "products.json"
)


def _to_s3_object_key(image_path: str) -> str:
    """Return a clean S3 object key.

    Seed JSON may contain a leading slash or omit the ``public/`` prefix.
    This helper normalizes both cases so the stored key matches the
    actual object in S3.

    Examples:
        ``/groceryImages/apple.png`` -> ``public/groceryImages/apple.png``
        ``groceryImages/apple.png``  -> ``public/groceryImages/apple.png``
        ``public/groceryImages/apple.png`` -> ``public/groceryImages/apple.png``
    """
    cleaned = image_path.strip().lstrip("/")
    if cleaned.startswith("public/"):
        return cleaned
    return f"public/{cleaned}"


def _normalize_product(product: dict) -> dict:
    """Return a product dict ready for persistence."""
    normalized: dict = {
        "title": product["title"],
        "description": product["description"],
        "price": product["price"],
        "categories": list(product.get("categories", []) or []),
        "rating": product.get("rating", 4),
        "amount": product.get("amount", 0),
        "shop_category": product["shop_category"],
        "unit_of_measure": product["unit_of_measure"],
    }

    for optional in ("oldPrice", "sizes", "colors", "authors"):
        if optional in product and product[optional] is not None:
            normalized[optional] = product[optional]

    raw_images = product.get("image") or []
    if isinstance(raw_images, str):
        raw_images = [raw_images]
    normalized["image"] = [_to_s3_object_key(img) for img in raw_images]

    return normalized


async def seed_products_if_empty(
    db: AsyncIOMotorDatabase, seed_path: Path | None = None
) -> int:
    """Seed products if the collection is empty.

    Returns the number of inserted products, or 0 if the collection was not
    empty or the seed file could not be loaded.
    """
    collection = db["products"]

    try:
        existing = await collection.count_documents({})
        if existing > 0:
            logger.info(
                "Products collection already has %s document(s); skipping seed.",
                existing,
            )
            return 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not determine product count: %s", exc)
        return 0

    path = seed_path or DEFAULT_SEED_PATH
    if not path.exists():
        logger.warning("Seed file not found: %s", path)
        return 0

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse seed file %s: %s", path, exc)
        return 0

    products = data.get("products", []) if isinstance(data, dict) else data
    if not isinstance(products, list):
        logger.error("Seed file must contain a list of products.")
        return 0

    if not products:
        logger.info("Seed file contained no products.")
        return 0

    inserted = 0
    for raw in products:
        try:
            normalized = _normalize_product(raw)
            product = Product(**normalized)
            await collection.insert_one(product.to_doc())
            inserted += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to seed product '%s': %s", raw.get("title", "<unknown>"), exc
            )

    logger.info("Seeded %s/%s products into MongoDB.", inserted, len(products))
    return inserted
