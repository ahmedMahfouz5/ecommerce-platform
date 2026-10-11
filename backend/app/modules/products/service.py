"""Business logic for product operations."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product
from app.modules.products.repository import ProductRepository
from app.modules.products.schemas import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)


class ProductService:
    """Service layer for product business logic."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_products(
        self,
        page: int = 1,
        page_size: int = 20,
        category: str | None = None,
    ) -> ProductListResponse:
        """Return a paginated list of products, optionally filtered by category."""
        repo = ProductRepository(self.session)
        products, total = await repo.get_all(
            page=page, page_size=page_size, category=category
        )
        return ProductListResponse(
            items=[ProductResponse.model_validate(p) for p in products],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=repo.total_pages(total, page_size),
        )

    async def get_product(self, product_id: uuid.UUID) -> ProductResponse:
        """Return a single product by ID."""
        product = await self._get_product_or_404(product_id)
        return ProductResponse.model_validate(product)

    async def create_product(self, data: ProductCreate) -> ProductResponse:
        """Create a new product."""
        repo = ProductRepository(self.session)
        product = Product(**data.model_dump())
        created = await repo.create(product)
        await self.session.commit()
        return ProductResponse.model_validate(created)

    async def update_product(
        self, product_id: uuid.UUID, data: ProductUpdate
    ) -> ProductResponse:
        """Update an existing product. Only provided fields are changed."""
        repo = ProductRepository(self.session)
        product = await repo.get_by_id(product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)

        updated = await repo.update(product)
        await self.session.commit()
        return ProductResponse.model_validate(updated)

    async def delete_product(self, product_id: uuid.UUID) -> None:
        """Delete a product by ID."""
        repo = ProductRepository(self.session)
        product = await repo.get_by_id(product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )

        await repo.delete(product)
        await self.session.commit()

    async def _get_product_or_404(self, product_id: uuid.UUID) -> Product:
        """Fetch a product or raise 404."""
        repo = ProductRepository(self.session)
        product = await repo.get_by_id(product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )

        return product
