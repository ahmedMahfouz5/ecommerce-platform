output "metrics_server_release" {
  description = "Name of the metrics-server Helm release"
  value       = helm_release.metrics_server.name
}

output "cluster_autoscaler_release" {
  description = "Name of the cluster-autoscaler Helm release"
  value       = helm_release.cluster_autoscaler.name
}

output "aws_lbc_release" {
  description = "Name of the AWS LBC Helm release"
  value       = helm_release.aws_lbc.name
}

output "kong_release" {
  description = "Name of the Kong Helm release"
  value       = helm_release.kong.name
}

output "external_dns_release" {
  description = "Name of the external-dns Helm release"
  value       = helm_release.external_dns.name
}

output "cert_manager_release" {
  description = "Name of the cert-manager Helm release"
  value       = helm_release.cert_manager.name
}

output "argocd_release" {
  description = "Name of the Argo CD Helm release"
  value       = helm_release.argocd.name
}

output "argocd_url" {
  description = "Public URL of Argo CD"
  value       = "https://${local.argocd_host}"
}

output "backend_s3_role_arn" {
  description = "ARN of the IAM role for backend S3 asset bucket access"
  value       = aws_iam_role.backend_s3.arn
}

output "backend_s3_role_name" {
  description = "Name of the IAM role for backend S3 asset bucket access"
  value       = aws_iam_role.backend_s3.name
}

