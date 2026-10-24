variable "env" {
  description = "Environment name (e.g., staging, prod)"
  type        = string
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

variable "cluster_name" {
  description = "EKS cluster name used for subnet tagging"
  type        = string
}


variable "availability_zones" {
  type = list(string)
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "EKS requires subnets in at least 2 AZs."
  }
}

variable "nat_gateway_count" {
  type    = number
  default = 1
  validation {
    condition     = var.nat_gateway_count >= 1 && var.nat_gateway_count <= length(var.availability_zones)
    error_message = "nat_gateway_count must be between 1 and the number of AZs."
  }
}
