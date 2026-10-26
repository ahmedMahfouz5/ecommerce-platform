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
variable "argocd_subdomain" {
  description = "Subdomain for Argo CD; final host is <argocd_subdomain>.<route53_zone_name>"
  type        = string
  default     = "argocd"
}
