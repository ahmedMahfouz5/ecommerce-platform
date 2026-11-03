"""Seed MongoDB with products from a JSON file.

Supports two shapes:
  1. A JSON object with a top-level "products" array.
  2. A raw JSON array of products.

Usage:
    python -m scripts.seed_products /path/to/products.json
    python -m scripts.seed_products --clear /path/to/products.json

Environment:
    MONGODB_URL (default: mongodb://mongo:27017/ecommerce)
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings


async def seed(path: Path, *, clear: bool = False) -> None:
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)

    if isinstance(data, dict):
        products = data.get("products", [])
    elif isinstance(data, list):
        products = data
    else:
        raise ValueError("JSON file must contain either a 'products' array or a raw list of products")

    if not isinstance(products, list):
        raise ValueError("products must be a list")

    client: AsyncIOMotorClient = AsyncIOMotorClient(settings.mongodb_url)
    db = client.get_default_database()
    collection = db["products"]

    if clear:
        deleted = await collection.delete_many({})
        print(f"Cleared {deleted.deleted_count} existing products.")

    for product in products:
        product.setdefault("image", [])
        product.setdefault("categories", [])
        if "id" in product:
            product["_id"] = product.pop("id")

    if products:
        result = await collection.insert_many(products)
        print(f"Seeded {len(result.inserted_ids)} products into MongoDB.")
    else:
        print("No products to seed.")

    client.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed MongoDB products")
    parser.add_argument("file", type=Path, help="Path to JSON file with products")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing products before seeding",
    )
    args = parser.parse_args()

    if not args.file.exists():
        print(f"File not found: {args.file}", file=sys.stderr)
        return 1

    asyncio.run(seed(args.file, clear=args.clear))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
