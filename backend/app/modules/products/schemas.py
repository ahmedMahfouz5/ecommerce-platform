"""Pydantic schemas for product request/response validation."""

import logging
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.services.s3 import get_cdn_url

logger = logging.getLogger(__name__)


class ProductCreate(BaseModel):
    """Schema for creating a new product."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock_quantity: int = Field(ge=0, default=0)
    category: str = Field(min_length=1, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def round_price(self) -> "ProductCreate":
        """Round price to 2 decimal places to match DECIMAL(10,2)."""
        self.price = self.price.quantize(Decimal("0.01"))
        return self


class ProductUpdate(BaseModel):
    """Schema for updating an existing product. All fields are optional."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    stock_quantity: int | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def round_price(self) -> "ProductUpdate":
        """Round price to 2 decimal places if provided."""
        if self.price is not None:
            self.price = self.price.quantize(Decimal("0.01"))
        return self


class ProductResponse(BaseModel):
    """Schema for product API responses."""

    id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    stock_quantity: int
    category: str
    image_url: str | None
    image_download_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def populate_download_url(self) -> "ProductResponse":
        """Generate a public CDN URL from the stored S3 object key.

        The database stores only the object key (e.g. "products/<uuid>/<uuid>.webp");
        this validator turns it into a cache-friendly CloudFront URL using the
        configured CDN domain.
        """
        if self.image_url:
            self.image_download_url = get_cdn_url(self.image_url)
        return self


class ProductListResponse(BaseModel):
    """Schema for paginated product list responses."""

    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
