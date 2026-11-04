provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.env
      Project     = "ecommerce-platform"
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.aws_region]
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.aws_region]
  }
}
#===========================================================================
# Route 53 Hosted Zone
# =============================================================================
# Keeps the same 4 nameservers across destroy/recreate, so Name.com is configured once
resource "aws_route53_delegation_set" "main" {
  reference_name = "ecommerce-${var.env}"
}

resource "aws_route53_zone" "main" {
  name              = var.route53_zone_name
  comment           = "Public hosted zone for ${var.route53_zone_name}, managed by Terraform (${var.env})"
  delegation_set_id = aws_route53_delegation_set.main.id
  force_destroy     = var.route53_force_destroy
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

# =============================================================================
# IAM Module
# =============================================================================
module "iam" {
  source = "../../modules/iam"

  env                 = var.env
  eks_name            = var.eks_name
  cluster_name        = module.eks.cluster_name
  account_id          = data.aws_caller_identity.current.account_id
  oidc_provider_arn   = module.eks.oidc_provider_arn
  oidc_issuer         = module.eks.cluster_oidc_issuer
  terraform_user_name = var.terraform_user_name

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
module "eks-addons" {
  source = "../../modules/eks-addons"

  cluster_name            = module.eks.cluster_name
  vpc_id                  = module.vpc.vpc_id
  aws_region              = var.aws_region
  ebs_csi_role_arn        = module.ebs.ebs_csi_role_arn
  route53_zone_id         = aws_route53_zone.main.zone_id
  route53_zone_name       = var.route53_zone_name
  acm_certificate_arn     = aws_acm_certificate_validation.nlb.certificate_arn
  backend_s3_bucket_arn   = module.s3-assets.bucket_arn
  backend_namespace       = var.backend_namespace
  backend_service_account = "backend-prod"

  depends_on = [module.ebs, module.iam, module.eks]
}

# =============================================================================
# Argo CD
# Deployed after Kong and external-dns are ready so the IngressClass and
# DNS records required by the Argo CD UI are available.
# =============================================================================
module "argocd" {
  source = "../../modules/argocd"

  route53_zone_name = var.route53_zone_name
  argocd_subdomain  = var.argocd_subdomain
  repo_url          = var.argocd_repo_url
  target_revision   = var.argocd_target_revision
  backend_namespace = var.backend_namespace
  database_url      = var.database_url
  secret_key        = var.secret_key
  postgres_password = var.postgres_password

  depends_on = [module.eks-addons]
}

# =============================================================================
# S3 Asset Bucket
# =============================================================================
module "s3-assets" {
  source = "../../modules/s3-assets"

  env        = var.env
  project    = "ecommerce"
  aws_region = var.aws_region

  cors_allowed_origins = [
    "https://${var.route53_zone_name}",
    "https://api.${var.route53_zone_name}",
    "https://www.${var.route53_zone_name}",
  ]
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
# SES Module
# =============================================================================
module "ses" {
  source       = "../../modules/ses"
  domain_name  = "ahmedmahfouz.click"
  sender_email = "no-reply@ahmedmahfouz.click"

  # Existing EKS backend Pod Identity role
  backend_pod_identity_role_name = module.eks-addons.backend_s3_role_name

  # DNS is managed by Route53 in this same configuration
  create_dns_records = true
  zone_id            = aws_route53_zone.main.zone_id

  tags = {
    Environment = var.env
    Project     = "ecommerce"
    ManagedBy   = "terraform"
  }

  depends_on = [module.eks-addons]
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


# =============================================================================
# ACM Certificate for CloudFront (must be in us-east-1)
# =============================================================================
resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name       = "cdn.${var.route53_zone_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.env}-cloudfront-cert"
  }
}

resource "aws_route53_record" "cloudfront_acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_acm_validation : record.fqdn]
}

# =============================================================================
# CloudFront Distribution for S3 assets
# =============================================================================
module "cloudfront" {
  source = "../../modules/cloudfront"

  env                                = var.env
  project                            = "ecommerce"
  origin_bucket_name                 = module.s3-assets.bucket_name
  origin_bucket_arn                  = module.s3-assets.bucket_arn
  origin_bucket_regional_domain_name = module.s3-assets.bucket_regional_domain_name
  certificate_arn                    = aws_acm_certificate_validation.cloudfront.certificate_arn
  aliases                            = ["cdn.${var.route53_zone_name}"]

  # Cache images aggressively; the backend can invalidate on update/delete.
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 1

  invalidation_items = ["/products/*", "/*.jpg", "/*.png", "/*.jpeg", "/*.gif", "/*.webp"]

  depends_on = [module.s3-assets, aws_acm_certificate_validation.cloudfront]
}

# =============================================================================
# Route 53 alias for the CDN custom domain
# =============================================================================
resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "cdn.${var.route53_zone_name}"
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
