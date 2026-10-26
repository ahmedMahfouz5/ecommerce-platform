output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets (for NLB placement)"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
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

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate for NLB TLS termination"
  value       = aws_acm_certificate.nlb.arn
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "route53_zone_name" {
  description = "Route 53 hosted zone name"
  value       = var.route53_zone_name
}

output "route53_name_servers" {
  description = "Route 53 name servers — configure these at Name.com for ahmedmahfouz.click"
  value       = aws_route53_zone.main.name_servers
}

output "configure_kubectl" {
  description = "Command to configure kubectl for this cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "nat_public_ips" {
  description = "NAT egress IPs (for third-party allowlists)"
  value       = module.vpc.nat_public_ips
}

output "argocd_url" {
  description = "Public URL of Argo CD"
  value       = module.eks-addons.argocd_url
}
