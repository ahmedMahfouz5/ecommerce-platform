"""API routes for product management.

WARNING: Write endpoints (POST, PUT, DELETE) are currently unprotected.
         Authentication will be added in a future milestone.
         Do not expose these endpoints publicly without authentication.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.products.schemas import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)
from app.modules.products.service import ProductService

router = APIRouter(
    prefix="/api/v1/products",
    tags=["products"],
)


def get_service(session: AsyncSession = Depends(get_session)) -> ProductService:
    return ProductService(session)


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(
        default=20, ge=1, le=100, alias="pageSize", description="Items per page"
    ),
    category: str | None = Query(default=None, description="Filter by category"),
    service: ProductService = Depends(get_service),
):
    """List products with optional category filtering and pagination."""
    return await service.list_products(
        page=page, page_size=page_size, category=category
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    service: ProductService = Depends(get_service),
):
    """Get a single product by ID."""
    try:
        return await service.get_product(product_id)
    except HTTPException:
        raise


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    service: ProductService = Depends(get_service),
):
    """Create a new product.

    WARNING: This endpoint is not yet protected by authentication.
    """
    return await service.create_product(data)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    service: ProductService = Depends(get_service),
):
    """Update an existing product. Only provided fields are changed.

    WARNING: This endpoint is not yet protected by authentication.
    """
    try:
        return await service.update_product(product_id, data)
    except HTTPException:
        raise


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    service: ProductService = Depends(get_service),
):
    """Delete a product by ID.

    WARNING: This endpoint is not yet protected by authentication.
    """
    try:
        await service.delete_product(product_id)
    except HTTPException:
        raise
