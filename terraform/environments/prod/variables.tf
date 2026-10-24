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
  default     = ["t3.large"]
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 0
}

variable "node_capacity_type" {
  description = "Capacity type for the node group"
  type        = string
  default     = "ON_DEMAND"
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
