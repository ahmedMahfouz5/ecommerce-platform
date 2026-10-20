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

output "external_nginx_release" {
  description = "Name of the nginx-ingress Helm release"
  value       = helm_release.external_nginx.name
}

output "cert_manager_release" {
  description = "Name of the cert-manager Helm release"
  value       = helm_release.cert_manager.name
}
