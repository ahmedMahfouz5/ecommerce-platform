"""Pydantic schemas for product-image upload requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class ImageUploadUrlRequest(BaseModel):
    """Client requests a presigned upload URL."""

    content_type: str = Field(
        description="MIME type of the image to upload (e.g. image/jpeg)",
        examples=["image/jpeg", "image/png", "image/webp"],
    )
    file_size_bytes: int = Field(
        gt=0,
        description="Size of the file in bytes (max 10 MB)",
        examples=[524288],
    )


class ImageUploadUrlResponse(BaseModel):
    """Presigned URL response returned to an authorized client."""

    upload_url: str = Field(
        description="Presigned PUT URL for uploading directly to S3",
    )
    object_key: str = Field(
        description="S3 object key assigned to this upload",
    )
    content_type: str = Field(
        description="Expected Content-Type that the upload must use",
    )
    expires_in_seconds: int = Field(
        description="Lifetime of the presigned URL in seconds",
    )


class ImageUrlResponse(BaseModel):
    """Public CDN URL(s) for viewing a product's images."""

    image_url: str | None = Field(
        description="Primary public CDN URL for downloading/viewing the image",
    )
    image_urls: list[str] = Field(
        default_factory=list,
        description="All public CDN URLs associated with the product",
    )
    object_key: str | None = Field(
        description="Primary S3 object key of the image",
    )
    object_keys: list[str] = Field(
        default_factory=list,
        description="All S3 object keys associated with the product",
    )
    expires_in_seconds: int = Field(
        description="Lifetime of the presigned URL in seconds",
    )


class ImageConfirmationRequest(BaseModel):
    """Request to confirm that an image upload completed successfully."""

    object_key: str = Field(
        description="S3 object key previously returned by the upload-url endpoint",
    )


class ImageResponse(BaseModel):
    """Response containing image metadata after confirmation."""

    product_id: str
    object_key: str
    content_type: str | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}
