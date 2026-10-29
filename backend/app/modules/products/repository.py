"""Data-access layer for Product entities."""

import uuid
from math import ceil

from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product


class ProductRepository:
    """Async repository for Product CRUD operations."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        category: str | None = None,
        q: str | None = None,
    ) -> tuple[list[Product], int]:
        """Return a paginated list of products and the total count.

        Optionally filtered by category (exact match) and/or q (case-insensitive
        substring search on name and description).
        """
        query = select(Product)

        if category:
            query = query.where(Product.category == category)

        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.where(
                or_(
                    Product.name.ilike(term),
                    Product.description.ilike(term),
                )
            )

        # Count total matching rows
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self._session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.order_by(Product.created_at.desc()).offset(offset).limit(page_size)

        result = await self._session.execute(query)
        products = list(result.scalars().all())

        return products, total

    async def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        """Return a single product by ID, or None if not found."""
        result = await self._session.execute(
            select(Product).where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def create(self, product: Product) -> Product:
        """Persist a new product and return it."""
        self._session.add(product)
        await self._session.flush()
        await self._session.refresh(product)
        return product

    async def update(self, product: Product) -> Product:
        """Update an existing product and return it."""
        await self._session.flush()
        await self._session.refresh(product)
        return product

    async def delete(self, product: Product) -> None:
        """Delete a product."""
        await self._session.delete(product)
        await self._session.flush()

    @staticmethod
    def total_pages(total: int, page_size: int) -> int:
        return max(1, ceil(total / page_size))
