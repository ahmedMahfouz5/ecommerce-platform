variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC (for AWS LBC)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "ebs_csi_role_arn" {
  description = "ARN of the EBS CSI IAM role"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 public hosted zone ID (for external-dns)"
  type        = string
}

variable "route53_zone_name" {
  description = "Route 53 public hosted zone name (e.g., example.com)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "Validated ACM certificate ARN for NLB TLS termination"
  type        = string
}

variable "disable_gp2_default" {
  description = "Remove the default flag from EKS's built-in gp2 StorageClass. Set false if gp2 doesn't exist."
  type        = bool
  default     = true
}
# =============================================================================
# Backend S3 Asset Bucket Access (Pod Identity)
# =============================================================================
variable "backend_s3_bucket_arn" {
  description = "ARN of the S3 asset bucket the backend needs PutObject access to"
  type        = string
}

variable "backend_namespace" {
  description = "Kubernetes namespace where the backend runs"
  type        = string
  default     = "prod"
}

variable "backend_service_account" {
  description = "Kubernetes service account name of the backend Deployment"
  type        = string
  default     = "backend-prod"
}


