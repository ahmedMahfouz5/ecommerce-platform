variable "cluster_name" {
  description = "Name of the EKS cluster (used for resource naming)"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the OIDC provider (for EBS CSI IRSA)"
  type        = string
}

variable "oidc_issuer" {
  description = "OIDC issuer URL (for EBS CSI IRSA condition)"
  type        = string
}
