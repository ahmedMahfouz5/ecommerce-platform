variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "env" {
  description = "Environment name (e.g., staging, prod)"
  type        = string
}

variable "eks_name" {
  description = "EKS cluster name suffix"
  type        = string
}

variable "eks_version" {
  description = "Kubernetes version"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "route53_zone_name" {
  description = "Route 53 public hosted zone name (e.g., example.com). Must already exist or be created by Terraform."
  type        = string
}

variable "nat_gateway_count" {
  description = "Number of NAT Gateways (1 for single-AZ, 2 for multi-AZ HA)"
  type        = number
  default     = 1
}

variable "node_instance_types" {
  description = "Instance types for the node group"
  type        = list(string)
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type        = number
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type        = number
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type        = number
}

variable "node_capacity_type" {
  description = "Capacity type for the node group"
  type        = string
}

variable "eks_public_access_cidrs" {
  description = "CIDRs allowed to reach the EKS public API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_disk_size" {
  type    = number
  default = 20
}

variable "route53_force_destroy" {
  description = "Delete all records (including external-dns ones) when destroying the zone"
  type        = bool
  default     = false
}

variable "terraform_user_name" {
  description = "Name of the existing terraform IAM user (created outside this module)"
  type        = string
  default     = "terraform"
}

# =============================================================================
# Argo CD
# =============================================================================
variable "argocd_subdomain" {
  description = "Subdomain for Argo CD; final host is <argocd_subdomain>.<route53_zone_name>"
  type        = string
  default     = "argocd"
}

variable "argocd_repo_url" {
  description = "Git repository URL for the Argo CD child applications"
  type        = string
  default     = "https://github.com/ahmedMahfouz5/ecommerce-platform.git"
}

variable "argocd_target_revision" {
  description = "Git branch/tag/revision for the Argo CD child applications"
  type        = string
  default     = "main"
}

variable "backend_namespace" {
  description = "Kubernetes namespace where the backend runs"
  type        = string
  default     = "prod"
}

variable "database_url" {
  description = "Database connection URL for the FastAPI backend (stored in ecommerce-secret)"
  type        = string
  sensitive   = true
  default     = "postgresql+asyncpg://postgres:password@postgres:5432/ecommerce"
}

variable "secret_key" {
  description = "Secret key used by FastAPI for JWT signing, etc."
  type        = string
  sensitive   = true
  default     = "password"
}

variable "postgres_password" {
  description = "PostgreSQL password shared between backend and postgres chart"
  type        = string
  sensitive   = true
  default     = "password"
}

variable "mongodb_password" {
  description = "MongoDB root and custom user password shared with the mongodb chart"
  type        = string
  sensitive   = true
  default     = "password"
}

