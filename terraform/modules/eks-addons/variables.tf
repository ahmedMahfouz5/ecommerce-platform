variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC (for AWS LBC)"
  type        = string
}

variable "public_subnet_ids" {
  description = "IDs of the public subnets (for NLB provisioning)"
  type        = list(string)
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
