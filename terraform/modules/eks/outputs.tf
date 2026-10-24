output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.eks.name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.eks.endpoint
}

output "cluster_ca_certificate" {
  description = "Base64-encoded cluster CA certificate"
  value       = aws_eks_cluster.eks.certificate_authority[0].data
  sensitive   = true
}

output "cluster_oidc_issuer" {
  description = "OIDC issuer URL of the EKS cluster"
  value       = aws_eks_cluster.eks.identity[0].oidc[0].issuer
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "cluster_security_group_id" {
  description = "Security group ID of the EKS cluster"
  value       = aws_eks_cluster.eks.vpc_config[0].cluster_security_group_id
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = aws_eks_cluster.eks.arn
}

output "node_group_name" {
  description = "Name of the node group"
  value       = aws_eks_node_group.general.node_group_name
}

output "cluster_auth_token" {
  description = "Auth token for the EKS cluster (used by Helm/Kubernetes providers)"
  value       = data.aws_eks_cluster_auth.eks.token
  sensitive   = true
}

