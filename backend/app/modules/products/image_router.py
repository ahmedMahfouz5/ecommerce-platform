"""API routes for product-image upload management."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.modules.auth.dependencies import require_admin
from app.modules.products.image_schemas import (
    ImageConfirmationRequest,
    ImageResponse,
    ImageUrlResponse,
    ImageUploadUrlRequest,
    ImageUploadUrlResponse,
)
from app.modules.products.service import ProductService
from app.services.s3 import (
    generate_object_key,
    generate_presigned_upload_url,
    get_cdn_url,
    head_object,
    validate_image_upload_request,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/products",
    tags=["product-images"],
)


def get_service() -> ProductService:
    return ProductService()


@router.get(
    "/{product_id}/image-url",
    response_model=ImageUrlResponse,
    status_code=status.HTTP_200_OK,
)
async def get_product_image_url(
    product_id: str,
    service: ProductService = Depends(get_service),
):
    """Return the public CDN URL(s) for the product's current images."""
    product = await service._get_product_or_404(product_id)

    if not product.image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No image associated with this product",
        )

    download_urls = [get_cdn_url(key) for key in product.image if key]

    return ImageUrlResponse(
        image_url=download_urls[0] if download_urls else None,
        image_urls=download_urls,
        object_key=product.image[0] if product.image else None,
        object_keys=product.image,
        expires_in_seconds=settings.s3_presigned_url_expiration_seconds,
    )


@router.post(
    "/{product_id}/images/upload-url",
    response_model=ImageUploadUrlResponse,
    status_code=status.HTTP_200_OK,
)
async def request_image_upload_url(
    product_id: str,
    body: ImageUploadUrlRequest,
    service: ProductService = Depends(get_service),
    _admin: None = Depends(require_admin),
):
    """Generate a presigned S3 upload URL for a product image."""
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

    await service._get_product_or_404(product_id)

    object_key = generate_object_key(product_id, extension)

    try:
        upload_url = generate_presigned_upload_url(
            object_key=object_key,
            content_type=body.content_type,
        )
    except Exception:
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


@router.put(
    "/{product_id}/images/confirm",
    response_model=ImageResponse,
    status_code=status.HTTP_200_OK,
)
async def confirm_image_upload(
    product_id: str,
    body: ImageConfirmationRequest,
    service: ProductService = Depends(get_service),
    _admin: None = Depends(require_admin),
):
    """Confirm that a product image upload has completed and associate it."""
    product = await service._get_product_or_404(product_id)

    expected_prefix = f"products/{product_id}/"
    if not body.object_key.startswith(expected_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"The object key {body.object_key!r} does not belong to "
                f"product {product_id}."
            ),
        )

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
        logger.warning(
            "Could not verify S3 object existence for key %s: %s",
            body.object_key,
            exc,
        )

    if not product.image:
        product.image = []
    if body.object_key not in product.image:
        product.image.append(body.object_key)

    repo = service._repo or await service._get_repo()
    updated = await repo.update(product_id, {"image": product.image})
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )

    logger.info(
        "Associated image %s with product %s",
        body.object_key,
        product_id,
    )

    return ImageResponse(
        product_id=product.id,
        object_key=body.object_key,
        updated_at=updated.updated_at,
    )
