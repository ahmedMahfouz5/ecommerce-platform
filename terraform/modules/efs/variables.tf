variable "cluster_name" {
  description = "Name of the EKS cluster (used for resource naming)"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for mount targets"
  type        = list(string)
}

variable "cluster_security_group_id" {
  description = "Security group ID of the EKS cluster for mount targets"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the OIDC provider (for EFS CSI IRSA)"
  type        = string
}

variable "oidc_issuer" {
  description = "OIDC issuer URL (for EFS CSI IRSA condition)"
  type        = string
}
