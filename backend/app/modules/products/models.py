"""Pydantic models for the Product entity stored in MongoDB."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator


class Product(BaseModel):
    """Product document model for MongoDB."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    price: float
    categories: list[str]
    image: list[str]
    rating: int = Field(ge=1, le=5)
    amount: int = Field(ge=0)
    shop_category: str
    unit_of_measure: str
    oldPrice: float | None = None
    sizes: list[str] | None = None
    colors: list[str] | None = None
    authors: list[str] | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("categories", mode="before")
    @classmethod
    def ensure_list_categories(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        return value

    @field_validator("image", mode="before")
    @classmethod
    def ensure_list_image(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        return value

    def to_doc(self) -> dict:
        """Serialize to a MongoDB document, mapping ``id`` to ``_id``."""
        doc = self.model_dump()
        doc["_id"] = doc.pop("id")
        return doc

    @classmethod
    def from_doc(cls, doc: dict | None) -> "Product | None":
        """Deserialize a MongoDB document back to a Product model."""
        if doc is None:
            return None
        data = dict(doc)
        if "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)
