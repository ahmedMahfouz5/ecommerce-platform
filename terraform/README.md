# Terraform — Modular E-Commerce Platform Infrastructure

## Layout

```
terraform/
├── modules/
│   ├── vpc/            # VPC, subnets, IGW, NAT, route tables
│   ├── eks/            # EKS cluster, node group, OIDC provider
│   ├── iam/            # IAM users, roles, access entries, app IRSA roles
│   ├── efs/            # EFS filesystem, mount targets, EFS CSI IAM role
│   └── eks-addons/     # All Helm releases + EKS add-ons + their IAM roles
├── environments/
│   └── prod/
│       ├── backend.tf          # S3 backend config
│       ├── main.tf             # Module calls + providers
│       ├── variables.tf        # Input variable declarations
│       ├── terraform.tfvars    # Environment-specific values
│       ├── outputs.tf          # Re-exported outputs
│       └── versions.tf         # Provider versions for the root
├── _old/                       # Original flat files (git-ignored)
└── README.md                   # This file
```

## Module Summary

### vpc
Networking fabric: VPC, public/private subnets, Internet Gateway, NAT Gateway, route tables, and route table associations.

**Inputs:** `env`, `vpc_cidr`, `availability_zones`, `private_subnet_cidrs`, `public_subnet_cidrs`, `cluster_name`
**Outputs:** `vpc_id`, `private_subnet_ids`, `public_subnet_ids`, `nat_gateway_id`

### eks
EKS cluster with a managed node group, cluster IAM role, OIDC provider, and data sources for provider configuration.

**Inputs:** `env`, `eks_name`, `eks_version`, `private_subnet_ids`, node group sizing/type vars
**Outputs:** `cluster_name`, `cluster_endpoint`, `cluster_ca_certificate` (sensitive), `cluster_oidc_issuer`, `oidc_provider_arn`, `cluster_security_group_id`, `cluster_arn`, `node_group_name`, `cluster_auth_token` (sensitive)

### iam
IAM users (developer, manager), admin role with assume policy, EKS access entries, and app-level IRSA role for Secrets Manager.

**Inputs:** `env`, `eks_name`, `cluster_name`, `account_id`, `oidc_provider_arn`, `oidc_issuer`
**Outputs:** `developer_iam_user_arn`, `eks_admin_role_arn`, `myapp_secrets_role_arn`

### efs
EFS filesystem (encrypted), mount targets in private subnets, and the EFS CSI driver IAM role (IRSA).

**Inputs:** `cluster_name`, `private_subnet_ids`, `cluster_security_group_id`, `oidc_provider_arn`, `oidc_issuer`
**Outputs:** `efs_filesystem_id`, `efs_csi_role_arn`

### eks-addons
All cluster add-ons deployed via Helm and EKS native add-ons, along with their IAM roles and pod identity associations.

Contains: metrics-server, pod-identity-agent, cluster-autoscaler, AWS Load Balancer Controller, NGINX Ingress, cert-manager, EBS CSI Driver, EFS CSI Driver (Helm), Secrets Store CSI Driver + AWS Provider, and the EFS storage class.

**Inputs:** `cluster_name`, `vpc_id`, `oidc_provider_arn`, `oidc_issuer`, `aws_region`, `efs_filesystem_id`, `efs_csi_role_arn`
**Outputs:** release names for key Helm charts

## Dependency Graph

```
vpc ──→ eks ──→ iam
         │
         ├──→ efs
         │
         └──→ eks-addons (also depends on efs, iam)
```

## Commands

```bash
# Initialize (first time or after backend change)
cd terraform/environments/prod
terraform init

# Plan
terraform plan

# Apply
terraform apply
```

## State Migration Warning

This refactoring moved resources from a flat structure into modules. Resource addresses have changed.
**No `moved` blocks or `terraform state mv` commands are included.**
Running `terraform plan` after this refactoring **will show all resources as new creations** and the old resources as orphaned.
You must handle state migration manually if you want to preserve existing infrastructure.

The old flat files have been moved to `_old/` for reference.

## Missing Value Files

The following files are referenced by the `eks-addons` module but do not exist on disk.
You must populate them with the actual content:

- `modules/eks-addons/files/metrics-server.yaml`
- `modules/eks-addons/files/nginx-ingress.yaml`
- `modules/eks-addons/files/AWSLoadBalancerController.json`

Placeholder files have been created in each location.
