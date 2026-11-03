"""Data-access layer for Product entities backed by MongoDB."""

import re
from math import ceil

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.modules.products.models import Product


class ProductRepository:
    """Async repository for Product CRUD operations using MongoDB."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._collection = db["products"]

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        category: str | None = None,
        q: str | None = None,
    ) -> tuple[list[Product], int]:
        """Return a paginated list of products and the total count."""
        filter_query: dict = self._build_filter(category, q)

        total = await self._collection.count_documents(filter_query)

        offset = (page - 1) * page_size
        cursor = (
            self._collection.find(filter_query)
            .sort("created_at", -1)
            .skip(offset)
            .limit(page_size)
        )
        docs = await cursor.to_list(length=page_size)

        return [Product.from_doc(doc) for doc in docs if doc is not None], total

    async def get_by_id(self, product_id: str) -> Product | None:
        """Return a single product by ID, or None if not found."""
        doc = await self._collection.find_one({"_id": product_id})
        return Product.from_doc(doc)

    async def create(self, product: Product) -> Product:
        """Persist a new product and return it."""
        await self._collection.insert_one(product.to_doc())
        return product

    async def update(self, product_id: str, data: dict) -> Product | None:
        """Update an existing product partially and return it."""
        data.pop("id", None)
        data.pop("_id", None)
        data.pop("created_at", None)
        data["updated_at"] = Product.model_fields["updated_at"].default_factory()

        result = await self._collection.find_one_and_update(
            {"_id": product_id},
            {"$set": data},
            return_document=True,
        )
        return Product.from_doc(result)

    async def delete(self, product_id: str) -> bool:
        """Delete a product by ID."""
        result = await self._collection.delete_one({"_id": product_id})
        return result.deleted_count > 0

    @staticmethod
    def _build_filter(category: str | None, q: str | None) -> dict:
        filter_query: dict = {}
        conditions: list = []

        if category:
            conditions.append(
                {
                    "$or": [
                        {"shop_category": category},
                        {"categories": {"$in": [category]}},
                    ]
                }
            )

        if q and q.strip():
            term = re.escape(q.strip())
            conditions.append(
                {
                    "$or": [
                        {"title": {"$regex": term, "$options": "i"}},
                        {"description": {"$regex": term, "$options": "i"}},
                    ]
                }
            )

        if len(conditions) == 1:
            filter_query = conditions[0]
        elif len(conditions) > 1:
            filter_query = {"$and": conditions}

        return filter_query

    @staticmethod
    def total_pages(total: int, page_size: int) -> int:
        return max(1, ceil(total / page_size))
