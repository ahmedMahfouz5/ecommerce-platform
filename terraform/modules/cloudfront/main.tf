# =============================================================================
# CloudFront Distribution Module
#
# Creates a CloudFront distribution with S3 as the origin using Origin Access
# Control (OAC). The S3 bucket remains private; no public bucket access is
# exposed. The distribution supports a custom domain, ACM TLS certificate,
# custom cache policies, and an optional cache invalidation resource.
# =============================================================================

locals {
  common_tags = {
    Environment = var.env
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Origin Access Control (OAC)
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.project}-${var.env}-s3-oac"
  description                       = "Origin Access Control for ${var.origin_bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------------------------------------------------------------------------
# S3 Bucket Policy allowing CloudFront OAC access
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "s3_oac" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${var.origin_bucket_arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = var.origin_bucket_name
  policy = data.aws_iam_policy_document.s3_oac.json
}

# ---------------------------------------------------------------------------
# CloudFront Cache Policy
# ---------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "assets" {
  name        = "${var.project}-${var.env}-assets-cache-policy"
  comment     = "Cache policy for ${var.project} ${var.env} asset delivery"
  default_ttl = var.default_ttl
  max_ttl     = var.max_ttl
  min_ttl     = var.min_ttl

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = var.forward_query_string ? "whitelist" : "none"
    }
  }
}

# ---------------------------------------------------------------------------
# CloudFront Distribution
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = var.enable_ipv6
  comment             = "${var.project} ${var.env} CDN"
  default_root_object = var.default_root_object
  price_class         = var.price_class
  aliases             = var.aliases

  origin {
    domain_name              = var.origin_bucket_regional_domain_name
    origin_id                = "S3-${var.origin_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  default_cache_behavior {
    allowed_methods  = var.allowed_methods
    cached_methods   = var.cached_methods
    target_origin_id = "S3-${var.origin_bucket_name}"
    cache_policy_id  = aws_cloudfront_cache_policy.assets.id
    compress         = var.compress
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = var.minimum_protocol_version
    cloudfront_default_certificate = false
  }

  dynamic "logging_config" {
    for_each = var.enable_logging && var.log_bucket_domain_name != "" ? [1] : []
    content {
      include_cookies = false
      bucket          = var.log_bucket_domain_name
      prefix          = var.log_prefix
    }
  }

  tags = local.common_tags

  depends_on = [aws_cloudfront_origin_access_control.s3]
}

# ---------------------------------------------------------------------------
# Cache Invalidation
# ---------------------------------------------------------------------------
resource "terraform_data" "invalidation" {
  count = var.invalidation_items != null && length(var.invalidation_items) > 0 ? 1 : 0

  triggers_replace = [
    timestamp(),
  ]

  provisioner "local-exec" {
    environment = {
      DISTRIBUTION_ID = aws_cloudfront_distribution.this.id
      PATHS           = join(" ", var.invalidation_items)
    }

    command = "aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths $PATHS"
  }

  depends_on = [aws_cloudfront_distribution.this]
}
