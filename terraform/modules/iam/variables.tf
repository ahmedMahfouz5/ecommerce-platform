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

variable "myapp_namespace" {
  type    = string
  default = "default" # set this to your real app namespace
}

variable "myapp_service_account" {
  type    = string
  default = "myapp"
}

variable "myapp_secret_arns" {
  description = "Secrets the app may read. Null = arn:...:secret:<env>/myapp/*"
  type        = list(string)
  default     = null
}

variable "require_mfa" {
  description = "Require MFA to assume the admin role"
  type        = bool
  default     = false
}

variable "terraform_user_name" {
  description = "Name of the existing terraform IAM user"
  type        = string
}

