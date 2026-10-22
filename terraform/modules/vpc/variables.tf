variable "env" {
  description = "Environment name (e.g., staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "cluster_name" {
  description = "EKS cluster name used for subnet tagging"
  type        = string
}

variable "nat_gateway_count" {
  description = "Number of NAT Gateways (1 or 2). 1 = single-AZ NAT, 2 = one per public AZ for HA."
  type        = number
  default     = 1
  validation {
    condition     = var.nat_gateway_count == 1 || var.nat_gateway_count == 2
    error_message = "nat_gateway_count must be 1 or 2"
  }
}

