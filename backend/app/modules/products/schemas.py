"""Pydantic schemas for product request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.services.s3 import get_cdn_url


class ProductBase(BaseModel):
    """Common fields for product create/update."""

    title: str | None = None
    description: str | None = None
    price: float | None = None
    categories: list[str] | None = None
    image: list[str] | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    amount: int | None = Field(default=None, ge=0)
    shop_category: str | None = None
    unit_of_measure: str | None = None
    oldPrice: float | None = None
    sizes: list[str] | None = None
    colors: list[str] | None = None
    authors: list[str] | None = None

    @field_validator("categories", mode="before")
    @classmethod
    def normalize_categories(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            return [value]
        return list(value)

    @field_validator("image", mode="before")
    @classmethod
    def normalize_image(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            return [value]
        return list(value)


class ProductCreate(ProductBase):
    """Schema for creating a new product."""

    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    price: float = Field(gt=0)
    categories: list[str]
    image: list[str]
    rating: int = Field(ge=1, le=5)
    amount: int = Field(ge=0)
    shop_category: str = Field(min_length=1, max_length=100)
    unit_of_measure: str = Field(min_length=1, max_length=50)


class ProductUpdate(ProductBase):
    """Schema for updating an existing product. All fields are optional."""
    pass


class ProductResponse(BaseModel):
    """Schema for product API responses."""

    id: str
    title: str
    description: str
    price: float
    categories: list[str]
    image: list[str]
    rating: int
    amount: int
    shop_category: str
    unit_of_measure: str
    oldPrice: float | None = None
    sizes: list[str] | None = None
    colors: list[str] | None = None
    authors: list[str] | None = None
    created_at: datetime
    updated_at: datetime
    image_download_url: list[str] | None = None
    on_sale: bool = False

    @model_validator(mode="after")
    def populate_download_urls(self) -> "ProductResponse":
        """Generate public CDN URLs from stored S3 object keys."""
        if self.image:
            self.image_download_url = [get_cdn_url(key) for key in self.image if key]
        return self

    @model_validator(mode="after")
    def detect_sale(self) -> "ProductResponse":
        """Flag items that have an oldPrice (sale)."""
        self.on_sale = self.oldPrice is not None
        return self


class ProductListResponse(BaseModel):
    """Schema for paginated product list responses."""

    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
