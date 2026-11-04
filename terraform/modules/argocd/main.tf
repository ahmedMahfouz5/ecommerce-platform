locals {
  argocd_host = "${var.argocd_subdomain}.${var.route53_zone_name}"

  apps_manifest = templatefile("${path.module}/files/apps.yaml.tftpl", {
    repo_url          = var.repo_url
    target_revision   = var.target_revision
    route53_zone_name = var.route53_zone_name
  })

  ecommerce_secret_manifest = templatefile("${path.module}/files/ecommerce-secret.yaml.tftpl", {
    namespace         = var.backend_namespace
    database_url      = var.database_url
    secret_key        = var.secret_key
    postgres_password = var.postgres_password
  })
}

# =============================================================================
# Argo CD (exposed through Kong at https://argocd.<zone>)
#
# Traffic path:
#   client --HTTPS---> NLB (ACM wildcard cert, TLS terminated)
#          --HTTP---> Kong proxy (:8000)
#          --HTTP---> argocd-server (:80, server.insecure=true)
#
# No extra ALB / certificate is needed:
#   - the ACM cert already covers *.<zone>
#   - external-dns already publishes *.<zone> -> NLB (Kong Service annotation)
#     and will also create an explicit argocd.<zone> record from the Ingress.
# =============================================================================
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "10.11.1"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 900

  values = [yamlencode({
    global = {
      domain = local.argocd_host
    }

    configs = {
      cm = {
        url = "https://${local.argocd_host}"
      }
      params = {
        # TLS is terminated at the NLB, Argo CD serves plain HTTP behind Kong
        "server.insecure" = true
      }
    }

    server = {
      service = {
        type = "ClusterIP"
      }
      ingress = {
        enabled          = true
        ingressClassName = "kong"
        hostname         = local.argocd_host
        path             = "/"
        pathType         = "Prefix"
      }
    }
  })]
}

# =============================================================================
# Argo CD App-of-Apps bootstrap
#
# Renders apps.yaml from the template and applies it with kubectl after
# Argo CD is deployed and its CRDs are registered.
#
# The rendered YAML contains one Application per microservice (postgres,
# migration, backend, frontend, kong-routes) with sync-wave ordering, so
# Argo CD auto-syncs the full platform once this manifest lands.
#
# A trigger of sha256 ensures the manifest is re-applied whenever the template
# content, repo URL, or target revision changes.
# =============================================================================
resource "null_resource" "argocd_apps" {
  triggers = {
    manifest_sha256 = sha256(local.apps_manifest)
    argo_ready      = helm_release.argocd.id
  }

  # Wait for the Argo CD server Deployment to be available, then apply the
  # apps.yaml. The "kubectl wait" ensures the API server already knows the
  # Application CRD before we submit the custom resources.
  provisioner "local-exec" {
    command     = <<-EOT
      kubectl wait --for=condition=available deployment/argocd-server \
        -n argocd --timeout=300s 2>/dev/null
      echo '${local.apps_manifest}' | kubectl apply -f -
    EOT
    interpreter = ["/bin/bash", "-c"]
  }

  depends_on = [helm_release.argocd]
}

# =============================================================================
# E-Commerce Secret Bootstrap
#
# Renders ecommerce-secret.yaml from the template and applies it with kubectl
# after Argo CD is ready. Sensitive values stay in Terraform state but are
# rendered into the YAML at apply time.
# =============================================================================
resource "null_resource" "ecommerce_secret" {
  triggers = {
    manifest_sha256 = sha256(local.ecommerce_secret_manifest)
    argo_ready      = helm_release.argocd.id
  }

  provisioner "local-exec" {
    command     = <<-EOT
      kubectl wait --for=condition=available deployment/argocd-server \
        -n argocd --timeout=300s 2>/dev/null
      echo '${local.ecommerce_secret_manifest}' | kubectl apply -f -
    EOT
    interpreter = ["/bin/bash", "-c"]
  }

  depends_on = [helm_release.argocd, null_resource.argocd_apps]
}
