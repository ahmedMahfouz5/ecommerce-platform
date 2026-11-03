"""Business logic for product operations backed by MongoDB."""

from fastapi import HTTPException, status

from app.core.mongodb import get_mongodb
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

    def __init__(self) -> None:
        self._repo: ProductRepository | None = None

    async def _get_repo(self) -> ProductRepository:
        if self._repo is None:
            db = await get_mongodb()
            self._repo = ProductRepository(db)
        return self._repo

    async def list_products(
        self,
        page: int = 1,
        page_size: int = 20,
        category: str | None = None,
        q: str | None = None,
    ) -> ProductListResponse:
        """Return a paginated list of products, optionally filtered."""
        repo = await self._get_repo()
        products, total = await repo.get_all(
            page=page, page_size=page_size, category=category, q=q,
        )
        return ProductListResponse(
            items=[ProductResponse.model_validate(p) for p in products],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=repo.total_pages(total, page_size),
        )

    async def get_product(self, product_id: str) -> ProductResponse:
        """Return a single product by ID."""
        product = await self._get_product_or_404(product_id)
        return ProductResponse.model_validate(product)

    async def create_product(self, data: ProductCreate) -> ProductResponse:
        """Create a new product."""
        repo = await self._get_repo()
        product = Product(**data.model_dump())
        created = await repo.create(product)
        return ProductResponse.model_validate(created)

    async def update_product(
        self, product_id: str, data: ProductUpdate
    ) -> ProductResponse:
        """Update an existing product. Only provided fields are changed."""
        await self._get_product_or_404(product_id)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            product = await self._get_product_or_404(product_id)
            return ProductResponse.model_validate(product)

        repo = await self._get_repo()
        updated = await repo.update(product_id, update_data)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )
        return ProductResponse.model_validate(updated)

    async def delete_product(self, product_id: str) -> None:
        """Delete a product by ID."""
        repo = await self._get_repo()
        if not await repo.delete(product_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )

    async def _get_product_or_404(self, product_id: str) -> Product:
        """Fetch a product or raise 404."""
        repo = await self._get_repo()
        product = await repo.get_by_id(product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )

        return product
