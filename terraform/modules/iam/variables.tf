variable "env" {
  description = "Environment name (e.g., staging, prod)"
  type        = string
}

variable "eks_name" {
  description = "EKS cluster name suffix"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster (for access entries)"
  type        = string
}

variable "account_id" {
  description = "AWS account ID"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the OIDC provider (for IRSA)"
  type        = string
}

variable "oidc_issuer" {
  description = "OIDC issuer URL (for IRSA condition)"
  type        = string
}
