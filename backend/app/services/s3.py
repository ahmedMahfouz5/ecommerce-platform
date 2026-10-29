"""S3 client and presigned URL generation.

Uses the standard AWS credential provider chain – no static access keys.
In EKS, credentials are obtained automatically through EKS Pod Identity.
In local development, the developer's configured AWS profile/credentials are used.
"""

import logging
import uuid
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

# Allowed image content types and their file extensions.
# The content type is used as a validation gate AND bound to the presigned URL.
ALLOWED_IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

# Maximum file size in bytes (hard guard before issuing a presigned URL).
MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MiB


def _build_s3_client():
    """Create a boto3 S3 client using the configured region.

    Credentials are discovered through the default credential provider chain:
      1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      2. Shared credential file (~/.aws/credentials)
      3. AWS config file (~/.aws/config)
      4. EKS Pod Identity (in-cluster)
      5. Instance profile / container credentials

    No access keys or secret keys are specified in application code.
    """
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        config=BotoConfig(
            retries={"mode": "standard", "max_attempts": 3},
        ),
    )


# Module-level client – boto3 clients are thread-safe and should be reused.
s3_client = _build_s3_client()


# ── health-check helper ────────────────────────────────────────────────────


def check_s3_connection() -> dict:
    """Verify S3 connectivity and bucket accessibility.

    Returns a dict with keys:
        connected  – bool
        bucket     – str  (the configured bucket name)
        region     – str  (the configured region)
        error      – str | None  (friendly error message when not connected)
    """
    result = {
        "connected": False,
        "bucket": settings.s3_assets_bucket,
        "region": settings.aws_region,
        "error": None,
    }

    try:
        # Head the bucket to confirm it exists and we can reach it
        s3_client.head_bucket(Bucket=settings.s3_assets_bucket)
        result["connected"] = True
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "404":
            result["error"] = f"Bucket '{settings.s3_assets_bucket}' not found"
        elif error_code == "403":
            result["error"] = f"Access denied to bucket '{settings.s3_assets_bucket}'"
        else:
            result["error"] = (
                f"S3 error ({error_code}): {exc.response.get('Error', {}).get('Message', str(exc))}"
            )
    except Exception as exc:
        result["error"] = f"S3 unreachable: {exc}"

    return result


# ── presigned URL helpers ──────────────────────────────────────────────────


def validate_image_upload_request(
    content_type: str,
    file_size_bytes: int,
) -> str:
    """Validate the proposed upload and return the canonical file extension.

    Raises:
        ValueError: If the content type or file size is not allowed.

    Returns:
        The file extension (including the dot, e.g. ".jpg").
    """
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValueError(
            f"Unsupported image format: {content_type!r}. "
            f"Allowed: {', '.join(ALLOWED_IMAGE_CONTENT_TYPES)}"
        )

    if file_size_bytes < 1:
        raise ValueError("File size must be greater than 0 bytes.")

    if file_size_bytes > MAX_UPLOAD_SIZE_BYTES:
        max_mb = MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise ValueError(
            f"File size {file_size_bytes} bytes exceeds maximum allowed "
            f"size of {MAX_UPLOAD_SIZE_BYTES} bytes ({max_mb} MiB)."
        )

    return ALLOWED_IMAGE_CONTENT_TYPES[content_type]


def generate_object_key(product_id: uuid.UUID, extension: str) -> str:
    """Generate a secure, unpredictable object key for a product image.

    Uses a UUID4 for the filename to guarantee uniqueness and avoid collisions
    without exposing original filenames. The key structure is:

        products/{product_id}/{random_uuid}{extension}

    The product_id portion is deterministic (based on the validated product),
    while the filename is random to prevent enumeration.
    """
    filename_uuid = uuid.uuid4()
    return f"products/{product_id}/{filename_uuid}{extension}"


def generate_presigned_upload_url(
    object_key: str,
    content_type: str,
    expiration: Optional[int] = None,
) -> str:
    """Generate a presigned URL for a single PutObject operation.

    The URL is scoped to:
      - The exact object key (no wildcards).
      - The PutObject operation only.
      - The expected Content-Type (browser must send this header).
      - A short, configurable expiration window.

    Args:
        object_key: The S3 object key to grant PutObject permission for.
        content_type: The expected MIME type of the uploaded object.
        expiration: Lifetime of the URL in seconds. Defaults to the configured value.

    Returns:
        A presigned PUT URL as a string.

    Raises:
        botocore.exceptions.ClientError: If the S3 client cannot generate the URL.
    """
    if expiration is None:
        expiration = settings.s3_presigned_url_expiration_seconds

    params = {
        "Bucket": settings.s3_assets_bucket,
        "Key": object_key,
        "ContentType": content_type,
    }

    url = s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params=params,
        ExpiresIn=expiration,
        HttpMethod="PUT",
    )

    # Do NOT log the full presigned URL – it is a bearer credential.
    logger.info(
        "Generated presigned PUT URL: bucket=%s key=%s content_type=%s expires=%ds",
        settings.s3_assets_bucket,
        object_key,
        content_type,
        expiration,
    )

    return url


def generate_presigned_download_url(
    object_key: str,
    expiration: Optional[int] = None,
) -> str:
    """Generate a presigned GET URL for downloading/viewing an object.

    Args:
        object_key: The S3 object key to grant GetObject permission for.
        expiration: Lifetime of the URL in seconds. Defaults to the configured value.

    Returns:
        A presigned GET URL as a string.

    Raises:
        botocore.exceptions.ClientError: If the S3 client cannot generate the URL.
    """
    if expiration is None:
        expiration = settings.s3_presigned_url_expiration_seconds

    params = {
        "Bucket": settings.s3_assets_bucket,
        "Key": object_key,
    }

    url = s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params=params,
        ExpiresIn=expiration,
        HttpMethod="GET",
    )

    logger.info(
        "Generated presigned GET URL: bucket=%s key=%s expires=%ds",
        settings.s3_assets_bucket,
        object_key,
        expiration,
    )

    return url


def head_object(object_key: str) -> bool:
    """Check whether an object with the given key exists in the bucket.

    Requires s3:HeadObject permission on the object.

    Returns:
        True if the object exists, False otherwise.
    """
    try:
        s3_client.head_object(
            Bucket=settings.s3_assets_bucket,
            Key=object_key,
        )
        return True
    except s3_client.exceptions.ClientError as exc:
        if exc.response["Error"]["Code"] == "404":
            return False
        raise
