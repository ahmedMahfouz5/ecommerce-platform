output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = module.eks.cluster_arn
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = module.eks.oidc_provider_arn
}

output "ebs_csi_role_arn" {
  description = "ARN of the EBS CSI driver IAM role"
  value       = module.ebs.ebs_csi_role_arn
}

output "myapp_secrets_role_arn" {
  description = "ARN of the IAM role for myapp Secrets Manager access"
  value       = module.iam.myapp_secrets_role_arn
}

output "eks_admin_role_arn" {
  description = "ARN of the EKS admin IAM role"
  value       = module.iam.eks_admin_role_arn
}
