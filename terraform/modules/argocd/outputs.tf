output "argocd_release" {
  description = "Name of the Argo CD Helm release"
  value       = helm_release.argocd.name
}

output "argocd_url" {
  description = "Public URL of Argo CD"
  value       = "https://${local.argocd_host}"
}
