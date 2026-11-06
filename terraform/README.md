# Terraform — Modular E-Commerce Platform Infrastructure

This Terraform codebase provisions the complete AWS infrastructure for a production-ready e-commerce platform.

## Layout

```
terraform/
├── modules/
│   ├── vpc/            # VPC, subnets, IGW, NAT, route tables
│   ├── eks/            # EKS cluster, node group, OIDC provider
│   ├── iam/            # IAM users, roles, access entries, app IRSA roles
│   ├── ebs/            # EBS CSI IAM role (IRSA)
│   ├── eks-addons/     # All Helm releases + EKS add-ons + their IAM roles
│   ├── argocd/         # Argo CD GitOps deployment and app definitions
│   ├── s3-assets/      # Private S3 bucket for image/assets storage
│   ├── cloudfront/     # CloudFront CDN distribution for S3 assets
│   └── ses/            # SES domain identity and email sending config
├── environments/
│   └── prod/
│       ├── backend.tf          # S3 backend config
│       ├── main.tf             # Module calls + providers
│       ├── variables.tf        # Input variable declarations
│       ├── terraform.tfvars    # Environment-specific values (not committed)
│       ├── outputs.tf          # Re-exported outputs
│       └── versions.tf         # Provider versions for the root
├── _old/                       # Original flat files (git-ignored)
└── README.md                   # This file
```

## Module Summary

| Module | Purpose | Key Resources |
|--------|---------|---------------|
| **vpc** | Networking fabric | VPC, public/private subnets, IGW, NAT, route tables |
| **eks** | Kubernetes cluster | EKS cluster, managed node group, OIDC provider |
| **iam** | Identity and access | IAM users, EKS admin role, IRSA roles |
| **ebs** | Block storage | EBS CSI driver IAM role |
| **eks-addons** | Cluster services | Metrics Server, Cluster Autoscaler, AWS LBC, Kong, ExternalDNS, cert-manager |
| **argocd** | GitOps | Argo CD Helm deployment, app definitions |
| **s3-assets** | Asset storage | Private S3 bucket with CORS |
| **cloudfront** | Content delivery | CloudFront distribution with OAC |
| **ses** | Email service | SES identity, DKIM, IAM policy |

### vpc
Networking fabric: VPC, public/private subnets, Internet Gateway, NAT Gateway, route tables.

**Inputs:** `env`, `vpc_cidr`, `availability_zones`, `private_subnet_cidrs`, `public_subnet_cidrs`, `cluster_name`, `nat_gateway_count`

**Outputs:** `vpc_id`, `private_subnet_ids`, `public_subnet_ids`, `nat_gateway_ids`, `nat_gateway_id`, `vpc_cidr`, `private_route_table_ids`, `nat_public_ips`

### eks
EKS cluster with managed node group, cluster IAM role, OIDC provider.

**Inputs:** `env`, `eks_name`, `eks_version`, `private_subnet_ids`, `node_instance_types`, `node_desired_size`, `node_max_size`, `node_min_size`, `node_capacity_type`, `public_access_cidrs`, `node_disk_size`

**Outputs:** `cluster_name`, `cluster_endpoint`, `cluster_ca_certificate`, `cluster_oidc_issuer`, `oidc_provider_arn`, `cluster_security_group_id`, `cluster_arn`, `node_group_name`, `cluster_auth_token`

### iam
IAM users, admin role with assume policy, EKS access entries, IRSA roles.

**Inputs:** `env`, `eks_name`, `cluster_name`, `account_id`, `oidc_provider_arn`, `oidc_issuer`, `myapp_namespace`, `myapp_service_account`, `myapp_secret_arns`, `require_mfa`, `terraform_user_name`

**Outputs:** `developer_iam_user_arn`, `eks_admin_role_arn`, `myapp_secrets_role_arn`

### ebs
EBS CSI driver IAM role (IRSA) for EBS volume provisioning.

**Inputs:** `cluster_name`, `oidc_provider_arn`, `oidc_issuer`

**Outputs:** `ebs_csi_role_arn`

### eks-addons
Helm releases and EKS add-ons with Pod Identity associations.

Includes: EKS add-ons (pod-identity-agent, aws-ebs-csi-driver), Metrics Server, Cluster Autoscaler, AWS Load Balancer Controller, Kong Gateway, ExternalDNS, cert-manager, Secrets Store CSI Driver, gp3 StorageClass, backend S3 access.

**Inputs:** `cluster_name`, `vpc_id`, `aws_region`, `ebs_csi_role_arn`, `route53_zone_id`, `route53_zone_name`, `acm_certificate_arn`, `disable_gp2_default`, `backend_s3_bucket_arn`, `backend_namespace`, `backend_service_account`

### argocd
Argo CD GitOps controller with child applications.

**Inputs:** `route53_zone_name`, `argocd_subdomain`, `repo_url`, `target_revision`, `backend_namespace`, `database_url`, `secret_key`, `postgres_password`, `mongodb_password`

**Outputs:** `argocd_release`, `argocd_url`

### s3-assets
Private S3 bucket for product images and assets with CORS support.

**Inputs:** `env`, `project`, `aws_region`, `force_destroy`, `cors_allowed_origins`

**Outputs:** `bucket_name`, `bucket_arn`, `bucket_regional_domain_name`

### cloudfront
CloudFront CDN with Origin Access Control for S3.

**Inputs:** `env`, `project`, `origin_bucket_name`, `origin_bucket_arn`, `origin_bucket_regional_domain_name`, `certificate_arn`, `aliases`, `default_root_object`, `price_class`, `minimum_protocol_version`, `enable_ipv6`, `allowed_methods`, `cached_methods`, `default_ttl`, `max_ttl`, `min_ttl`, `compress`, `forward_query_string`, `forward_cookies`, `enable_logging`, `log_bucket_domain_name`, `log_prefix`, `invalidation_items`, `tags`

**Outputs:** `distribution_id`, `distribution_arn`, `distribution_domain_name`, `distribution_hosted_zone_id`, `origin_access_control_id`, `cache_policy_id`, `invalidation_command`

### ses
SES domain identity and email configuration.

**Inputs:** `domain_name`, `sender_email`, `zone_id`, `backend_pod_identity_role_name`, `tags`, `create_dns_records`

**Outputs:** `ses_domain_identity_arn`, `ses_configuration_set_name`, `sender_email`, `ses_iam_policy_arn`, `dkim_records`

## Dependency Graph

```
vpc ──→ eks ──→ iam
        │       │
        ├──→ ebs
        │
        ├──→ eks-addons ─────────→ s3-assets
        │       │                       │
        │       ├──→ cloudfront ←───────┘
        │       │
        │       ├──→ ses
        │       │
        │       └──→ argocd
        │
        └──→ argocd
```

## Commands

```bash
# Navigate to environment
cd terraform/environments/prod

# Initialize
terraform init

# Format and validate
terraform fmt -recursive
terraform validate

# Plan and apply
terraform plan
terraform apply

# Staged apply (for first-time setup)
terraform apply -target=module.vpc -target=module.eks
terraform apply -target=module.iam -target=module.ebs -target=module.s3-assets
terraform apply
```

## Required Configuration

Create `environments/prod/terraform.tfvars`:

```hcl
aws_region = "us-west-2"
env        = "prod"
project    = "ecommerce"

vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-west-2a", "us-west-2b", "us-west-2c"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
nat_gateway_count    = 3

eks_name            = "ecommerce"
eks_version         = "1.29"
node_instance_types = ["m6i.large", "m5.large"]
node_desired_size   = 2
node_min_size       = 2
node_max_size       = 5
node_capacity_type  = "ON_DEMAND"
node_disk_size      = 20
public_access_cidrs = ["YOUR_IP/32"]

route53_zone_id     = "ZXXXXXXXXXXXXX"
route53_zone_name   = "example.com"
acm_certificate_arn = "arn:aws:acm:us-west-2:ACCOUNT_ID:certificate/UUID"

ses_domain_name      = "example.com"
ses_sender_email     = "noreply@example.com"
ses_create_dns_records = true

database_url      = "postgresql+asyncpg://postgres:STRONG_PASSWORD@postgres.prod:5432/ecommerce"
secret_key        = "STRONG_RANDOM_SECRET"
postgres_password = "STRONG_POSTGRES_PASSWORD"
mongodb_password  = "STRONG_MONGODB_PASSWORD"

cors_allowed_origins = ["https://example.com", "https://www.example.com"]
```

## Configuration Files

| Module | File | Purpose |
|--------|------|---------|
| eks-addons | `files/metrics-server.yaml` | Metrics Server values |
| eks-addons | `files/lbc-iam-policy.json` | Load Balancer Controller IAM policy |
| eks-addons | `files/kong-gateway.yaml.tftpl` | Kong Gateway config template |
| eks-addons | `files/kong-routes.yaml.tftpl` | Kong routes template |
| argocd | `files/apps.yaml.tftpl` | Argo CD Application definitions |
| argocd | `files/ecommerce-secret.yaml.tftpl` | Sealed secrets template |

## Troubleshooting

```bash
# Force unlock
terraform force-unlock LOCK_ID

# Re-initialize modules
terraform init -upgrade

# Check Helm releases
helm list -A

# Check pod logs
kubectl logs -n <namespace> <pod-name>

# Check ACM certificate
aws acm describe-certificate --certificate-arn <arn> --region us-west-2
```

## State Migration Note

No `moved` blocks included. Migrating from flat structure will show resources as new. Handle manually or use `terraform state mv`. Old files in `_old/` for reference.
