variable "env" {
  description = "Environment name (e.g., staging, prod)"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.env))
    error_message = "env must be lowercase alphanumeric with hyphens, starting with a letter."
  }
}

variable "project" {
  description = "Project name used for the bucket name prefix"
  type        = string
  default     = "ecommerce"
}

variable "aws_region" {
  description = "AWS region for the S3 bucket"
  type        = string
}

variable "force_destroy" {
  description = "Allow Terraform to destroy a non-empty bucket. Set to true only for non-production environments."
  type        = bool
  default     = false
}
