variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC (for AWS LBC)"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the OIDC provider (for IRSA)"
  type        = string
}

variable "oidc_issuer" {
  description = "OIDC issuer URL (for IRSA)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "efs_filesystem_id" {
  description = "ID of the EFS file system (for storage class)"
  type        = string
  default     = ""
}

variable "efs_csi_role_arn" {
  description = "ARN of the EFS CSI IAM role"
  type        = string
  default     = ""
}
