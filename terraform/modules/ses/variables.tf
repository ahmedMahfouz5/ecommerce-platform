variable "domain_name" {
  description = "Domain used for sending emails"
  type        = string
}

variable "sender_email" {
  description = "Verified sender email address"
  type        = string
}

variable "zone_id" {
  description = "Route53 hosted zone ID. Null when DNS is managed externally."
  type        = string
  default     = null
}

variable "backend_pod_identity_role_name" {
  description = "IAM role name used by the EKS backend Pod Identity"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

variable "create_dns_records" {
  description = "Automatically create SES DNS records in Route53"
  type        = bool
  default     = false
}
