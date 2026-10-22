# =============================================================================
# Provider configuration
# =============================================================================
provider "aws" {
  region = var.aws_region
}

# =============================================================================
# Data source for AWS account ID
# =============================================================================
data "aws_caller_identity" "current" {}

# =============================================================================
# VPC Module
# =============================================================================
module "vpc" {
  source = "../../modules/vpc"

  env                  = var.env
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
  cluster_name         = "${var.env}-${var.eks_name}"
}

# =============================================================================
# EKS Module
# =============================================================================
module "eks" {
  source = "../../modules/eks"

  env                = var.env
  eks_name           = var.eks_name
  eks_version        = var.eks_version
  private_subnet_ids = module.vpc.private_subnet_ids

  node_instance_types = var.node_instance_types
  node_desired_size   = var.node_desired_size
  node_max_size       = var.node_max_size
  node_min_size       = var.node_min_size
  node_capacity_type  = var.node_capacity_type
}

# =============================================================================
# Helm and Kubernetes providers (configured from EKS module outputs)
# =============================================================================
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
    token                  = module.eks.cluster_auth_token
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  token                  = module.eks.cluster_auth_token
}

# =============================================================================
# IAM Module
# =============================================================================
module "iam" {
  source = "../../modules/iam"

  env               = var.env
  eks_name          = var.eks_name
  cluster_name      = module.eks.cluster_name
  account_id        = data.aws_caller_identity.current.account_id
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.cluster_oidc_issuer

  depends_on = [module.eks]
}

# =============================================================================
# EBS Module
# =============================================================================
module "ebs" {
  source = "../../modules/efs"

  cluster_name      = module.eks.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.cluster_oidc_issuer
}

# =============================================================================
# EKS Add-ons Module
# =============================================================================
module "eks_addons" {
  source = "../../modules/eks-addons"

  cluster_name      = module.eks.cluster_name
  vpc_id            = module.vpc.vpc_id
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.cluster_oidc_issuer
  aws_region        = var.aws_region
  ebs_csi_role_arn  = module.ebs.ebs_csi_role_arn

  depends_on = [module.ebs, module.iam]
}
