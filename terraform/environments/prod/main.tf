# =============================================================================
# Provider configuration
# =============================================================================
provider "aws" {
  region = var.aws_region
}

# =============================================================================
# Data sources
# =============================================================================
data "aws_caller_identity" "current" {}

# Current AWS region
data "aws_region" "current" {}

# =============================================================================
# Route 53 Hosted Zone
# =============================================================================
# Creates the public hosted zone for the domain. After Terraform creates it,
# configure the 4 NS records (shown in the route53_name_servers output) as
# custom nameservers at your domain registrar (Name.com).
resource "aws_route53_zone" "main" {
  name          = var.route53_zone_name
  comment       = "Public hosted zone for ${var.route53_zone_name} — managed by Terraform (${var.env})"
  force_destroy = false

  tags = {
    Environment = var.env
    Name        = var.route53_zone_name
  }
}

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
  nat_gateway_count    = var.nat_gateway_count
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
  public_access_cidrs = var.eks_public_access_cidrs
  node_disk_size      = var.node_disk_size
}

# =============================================================================
# Fetch cluster details dynamically using Data Sources with a dependency on the EKS module
# =============================================================================
data "aws_eks_cluster" "cluster" {
  name       = module.eks.cluster_name # Or your variable name for the cluster name
  depends_on = [module.eks]
}

data "aws_eks_cluster_auth" "cluster" {
  name       = module.eks.cluster_name # Or your variable name for the cluster name
  depends_on = [module.eks]
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
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
# EBS Module (EBS CSI IAM)
# =============================================================================
module "ebs" {
  source = "../../modules/ebs"

  cluster_name      = module.eks.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer       = module.eks.cluster_oidc_issuer
}

# =============================================================================
# EKS Add-ons Module
# =============================================================================
module "eks_addons" {
  source = "../../modules/eks-addons"

  cluster_name        = module.eks.cluster_name
  vpc_id              = module.vpc.vpc_id
  aws_region          = var.aws_region
  ebs_csi_role_arn    = module.ebs.ebs_csi_role_arn
  route53_zone_id     = aws_route53_zone.main.zone_id
  route53_zone_name   = var.route53_zone_name
  acm_certificate_arn = aws_acm_certificate_validation.nlb.certificate_arn

  depends_on = [module.ebs, module.iam, module.eks]
}

# =============================================================================
# ACM Certificate for NLB TLS termination
# =============================================================================
# The certificate MUST be in the same region as the NLB.
# It is used by the Kong Gateway Service of type LoadBalancer (NLB).

resource "aws_acm_certificate" "nlb" {
  domain_name       = "*.${var.route53_zone_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    var.route53_zone_name
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.env}-nlb-cert"
  }
}

# Validate the ACM certificate via Route 53 DNS
resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.nlb.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "nlb" {
  certificate_arn         = aws_acm_certificate.nlb.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# =============================================================================
# Route 53 records managed via Terraform (static records)
#
# The dynamic per-service records (api.<domain>, frontend.<domain>) are
# managed by external-dns inside the cluster via the AWS Load Balancer
# Controller integrations.
#
# Here we only create the wildcard CNAME pointing to the NLB. Once the NLB
# is created by the AWS LBC (via Kong's LoadBalancer Service), you can
# create the record manually or let external-dns handle it.
# =============================================================================

