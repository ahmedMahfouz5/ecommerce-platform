"""API routes for product-image upload management."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import get_current_username
from app.modules.products.image_schemas import (
    ImageConfirmationRequest,
    ImageResponse,
    ImageUploadUrlRequest,
    ImageUploadUrlResponse,
)
from app.modules.products.models import Product
from app.modules.products.repository import ProductRepository
from app.services.s3 import (
    generate_object_key,
    generate_presigned_upload_url,
    head_object,
    validate_image_upload_request,
)
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/products",
    tags=["product-images"],
)


# ---------------------------------------------------------------------------
# Dependency: get a Product by ID or 404
# ---------------------------------------------------------------------------
async def _get_product_or_404(
    product_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Product:
    """Fetch a product by ID or raise HTTP 404."""
    repo = ProductRepository(session)
    product = await repo.get_by_id(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return product


# ---------------------------------------------------------------------------
# POST /api/v1/products/{product_id}/images/upload-url
# ---------------------------------------------------------------------------
@router.post(
    "/{product_id}/images/upload-url",
    response_model=ImageUploadUrlResponse,
    status_code=status.HTTP_200_OK,
)
async def request_image_upload_url(
    product_id: uuid.UUID,
    body: ImageUploadUrlRequest,
    session: AsyncSession = Depends(get_session),
    _username: str = Depends(get_current_username),
):
    """Generate a presigned S3 upload URL for a product image.

    Only authorized administrators should use this endpoint.
    The client must declare:
      - content_type: the MIME type (image/jpeg, image/png, image/webp).
      - file_size_bytes: the expected file size (max 10 MB).

    The backend validates the request, generates a cryptographically random
    object key, and returns a short-lived presigned PUT URL scoped to that
    key and content type.

    The presigned URL does NOT enforce the declared file size at the S3
    level (a standard PutObject presigned URL does not support content-length
    restrictions).  For strict size enforcement, a presigned POST with
    content-length-range conditions would be required.
    """
    # 1. Validate the requested content type and file size.
    try:
        extension = validate_image_upload_request(
            content_type=body.content_type,
            file_size_bytes=body.file_size_bytes,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    # 2. Verify the product exists.
    repo = ProductRepository(session)
    product = await repo.get_by_id(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )

    # 3. Generate a server-controlled object key.
    object_key = generate_object_key(product_id, extension)

    # 4. Generate the presigned URL.
    try:
        upload_url = generate_presigned_upload_url(
            object_key=object_key,
            content_type=body.content_type,
        )
    except Exception as exc:
        logger.exception("Failed to generate presigned URL for product %s", product_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL. Please try again later.",
        )

    return ImageUploadUrlResponse(
        upload_url=upload_url,
        object_key=object_key,
        content_type=body.content_type,
        expires_in_seconds=settings.s3_presigned_url_expiration_seconds,
    )


# ---------------------------------------------------------------------------
# PUT /api/v1/products/{product_id}/images/confirm
# ---------------------------------------------------------------------------
@router.put(
    "/{product_id}/images/confirm",
    response_model=ImageResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm_image_upload(
    product_id: uuid.UUID,
    body: ImageConfirmationRequest,
    session: AsyncSession = Depends(get_session),
    _username: str = Depends(get_current_username),
):
    """Confirm that a product image upload has completed and associate it.

    The client sends the object_key returned by the upload-url endpoint.
    The backend:
      1. Validates that the object_key belongs to this product.
      2. Optionally verifies the object exists in S3.
      3. Updates the product's image_url field with the object key.

    If s3:HeadObject permission is not available, S3 existence verification
    is skipped gracefully and the association is still performed.
    """
    repo = ProductRepository(session)
    product = await repo.get_by_id(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )

    # 1. Validate that the object key belongs to this product.
    #    The key must start with "products/{product_id}/"
    expected_prefix = f"products/{product_id}/"
    if not body.object_key.startswith(expected_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"The object key {body.object_key!r} does not belong to "
                f"product {product_id}."
            ),
        )

    # 2. Optionally verify the object exists in S3.
    #    This requires s3:HeadObject. If the IAM role doesn't have it, we
    #    log a warning but still allow the association (the caller is trusted
    #    after authentication/authorization is added).
    try:
        exists = head_object(body.object_key)
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Object {body.object_key!r} does not exist in S3. "
                    f"Please upload the image before confirming."
                ),
            )
    except HTTPException:
        raise
    except Exception as exc:
        # Could be an AccessDenied error if s3:HeadObject is missing.
        # Log and continue – the association is still valid.
        logger.warning(
            "Could not verify S3 object existence for key %s: %s",
            body.object_key,
            exc,
        )

    # 3. Update the product's image_url with the object key.
    product.image_url = body.object_key
    await repo.update(product)
    await session.commit()

    logger.info(
        "Associated image %s with product %s",
        body.object_key,
        product_id,
    )

    return ImageResponse(
        product_id=product.id,
        object_key=body.object_key,
        updated_at=product.updated_at,
    )
