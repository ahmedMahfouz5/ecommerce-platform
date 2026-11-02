variable "env" {
  description = "Environment name (e.g., staging, prod)"
  type        = string
}

variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ecommerce"
}

variable "origin_bucket_name" {
  description = "Name of the private S3 bucket that will be the CloudFront origin"
  type        = string
}

variable "origin_bucket_arn" {
  description = "ARN of the private S3 bucket that will be the CloudFront origin"
  type        = string
}

variable "origin_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 origin bucket"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1 for CloudFront TLS termination"
  type        = string
}

variable "aliases" {
  description = "List of alternate domain names (CNAMEs) for the CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "default_root_object" {
  description = "Default root object for the distribution"
  type        = string
  default     = "index.html"
}

variable "price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_All"
}

variable "minimum_protocol_version" {
  description = "Minimum TLS version for viewers"
  type        = string
  default     = "TLSv1.2_2021"
}

variable "enable_ipv6" {
  description = "Whether to enable IPv6 for the distribution"
  type        = bool
  default     = true
}

variable "allowed_methods" {
  description = "HTTP methods CloudFront processes and forwards to the origin"
  type        = list(string)
  default     = ["GET", "HEAD", "OPTIONS"]
}

variable "cached_methods" {
  description = "HTTP methods for which CloudFront caches responses"
  type        = list(string)
  default     = ["GET", "HEAD"]
}

variable "default_ttl" {
  description = "Default TTL for cached objects in seconds"
  type        = number
  default     = 86400
}

variable "max_ttl" {
  description = "Maximum TTL for cached objects in seconds"
  type        = number
  default     = 31536000
}

variable "min_ttl" {
  description = "Minimum TTL for cached objects in seconds"
  type        = number
  default     = 1
}

variable "compress" {
  description = "Whether CloudFront automatically compresses content for viewers that support it"
  type        = bool
  default     = true
}

variable "forward_query_string" {
  description = "Whether to forward query strings to the origin"
  type        = bool
  default     = false
}

variable "forward_cookies" {
  description = "Whether to forward cookies to the origin"
  type        = string
  default     = "none"
}

variable "cloudfront_default_ttl" {
  description = "Default TTL used by the managed CloudFront cache policy (if used)"
  type        = number
  default     = 86400
}

variable "cloudfront_max_ttl" {
  description = "Max TTL used by the managed CloudFront cache policy (if used)"
  type        = number
  default     = 604800
}

variable "cloudfront_min_ttl" {
  description = "Min TTL used by the managed CloudFront cache policy (if used)"
  type        = number
  default     = 1
}

variable "enable_logging" {
  description = "Whether to enable access logging for the distribution"
  type        = bool
  default     = false
}

variable "log_bucket_domain_name" {
  description = "Domain name of the S3 bucket for access logs (required if enable_logging is true)"
  type        = string
  default     = ""
}

variable "log_prefix" {
  description = "Prefix for access log files"
  type        = string
  default     = "cdn/"
}

variable "invalidation_items" {
  description = "List of paths to invalidate (e.g., [\"/*\", \"/products/*\"]). Set to null or leave default to skip invalidation."
  type        = list(string)
  default     = null
}

variable "tags" {
  description = "Additional tags to apply to CloudFront resources"
  type        = map(string)
  default     = {}
}
