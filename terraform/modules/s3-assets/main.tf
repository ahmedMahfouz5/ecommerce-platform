# =============================================================================
# S3 Asset Bucket
#
# Private bucket for application assets (product images, etc.).
# - Public access fully blocked.
# - Default server-side encryption (SSE-S3 / AES256).
# - Versioning enabled for object-recovery capability.
# - No IAM roles or bucket policies are created here; application access will
#   be granted later through EKS Pod Identity (or IRSA) with narrowly scoped
#   permissions. Keeping the bucket policy unconfigured is safer than adding
#   an unnecessarily permissive policy now.
# =============================================================================

locals {
  # Bucket names must be globally unique, DNS-compliant, and < 63 chars.
  # Format: <project>-<env>-<region>-assets
  # Example: ecommerce-staging-us-east-2-assets
  bucket_name = "${var.project}-${var.env}-${var.aws_region}-assets"
}

resource "aws_s3_bucket" "assets" {
  bucket        = local.bucket_name
  force_destroy = var.force_destroy
}

# Block *all* public access at the account / bucket level.
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

# Default server-side encryption: SSE-S3 (AES256).
# Uses the aws_s3_bucket_server_side_encryption_configuration resource
# (the modern, non-deprecated approach in provider >= 4.x / 5.x).
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Enable versioning so that objects are never permanently lost from
# accidental overwrites or deletes. Deleted objects become "delete markers"
# and previous versions remain recoverable. Storage costs increase with
# every version; no lifecycle expiration rules are applied here to avoid
# accidentally purging product images or prior versions.
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CORS — allow the frontend to PUT (upload) and GET (view) objects directly.
# Without this, browser-based presigned URL uploads will fail with a CORS /
# network error because the S3 endpoint rejects cross-origin requests.
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_origins = var.cors_allowed_origins
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
