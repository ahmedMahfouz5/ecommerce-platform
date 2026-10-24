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

variable "kms_key_arns" {
  description = "Customer-managed KMS key ARNs used to encrypt EBS volumes. Leave empty to use the default aws/ebs key."
  type        = list(string)
  default     = []
}
