"""Pydantic schemas for product-image upload requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ImageUploadUrlRequest(BaseModel):
    """Client requests a presigned upload URL.

    The client must declare the intended content type and file size so the
    backend can validate the proposed upload before generating a URL.
    """

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
        examples=["https://bucket.s3.amazonaws.com/products/..."],
    )
    object_key: str = Field(
        description="S3 object key assigned to this upload",
        examples=["products/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg"],
    )
    content_type: str = Field(
        description="Expected Content-Type that the upload must use",
    )
    expires_in_seconds: int = Field(
        description="Lifetime of the presigned URL in seconds",
    )


class ImageConfirmationRequest(BaseModel):
    """Request to confirm that an image upload completed successfully.

    The client sends the object_key that was previously returned by the
    upload-url endpoint. The backend validates that this key was generated
    through the authorized workflow.
    """

    object_key: str = Field(
        description="S3 object key previously returned by the upload-url endpoint",
        examples=["products/550e8400-e29b-41d4-a716-446655440000/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg"],
    )


class ImageResponse(BaseModel):
    """Response containing image metadata after confirmation."""

    product_id: uuid.UUID
    object_key: str
    content_type: str | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}
