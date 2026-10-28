data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

# -----------------------------------------------------------------------------
# Shared: Pod Identity trust policy + add-on version lookups
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "pod_identity_trust" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

data "aws_eks_addon_version" "pod_identity" {
  addon_name         = "eks-pod-identity-agent"
  kubernetes_version = data.aws_eks_cluster.this.version
  most_recent        = true
}

data "aws_eks_addon_version" "ebs_csi" {
  addon_name         = "aws-ebs-csi-driver"
  kubernetes_version = data.aws_eks_cluster.this.version
  most_recent        = true
}

# =============================================================================
# EKS add-ons
# =============================================================================
resource "aws_eks_addon" "pod_identity" {
  cluster_name                = var.cluster_name
  addon_name                  = "eks-pod-identity-agent"
  addon_version               = data.aws_eks_addon_version.pod_identity.version
  resolve_conflicts_on_create = "OVERWRITE"
}

resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name                = var.cluster_name
  addon_name                  = "aws-ebs-csi-driver"
  addon_version               = data.aws_eks_addon_version.ebs_csi.version
  service_account_role_arn    = var.ebs_csi_role_arn
  resolve_conflicts_on_create = "OVERWRITE"
}

# EKS creates a default "gp2" class; remove its default flag before adding gp3
resource "kubernetes_annotations" "gp2_not_default" {
  count       = var.disable_gp2_default ? 1 : 0
  api_version = "storage.k8s.io/v1"
  kind        = "StorageClass"
  metadata { name = "gp2" }
  annotations = { "storageclass.kubernetes.io/is-default-class" = "false" }
  force       = true

  depends_on = [aws_eks_addon.ebs_csi_driver]
}

resource "kubernetes_storage_class_v1" "ebs_gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type      = "gp3"
    encrypted = "true"
  }

  depends_on = [aws_eks_addon.ebs_csi_driver, kubernetes_annotations.gp2_not_default]
}

# =============================================================================
# Metrics Server
# =============================================================================
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.14.0"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  values = [file("${path.module}/files/metrics-server.yaml")]
}

# =============================================================================
# Cluster Autoscaler (Pod Identity)
# =============================================================================
resource "aws_iam_role" "cluster_autoscaler" {
  name               = "${var.cluster_name}-cluster-autoscaler"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_trust.json
}

data "aws_iam_policy_document" "cluster_autoscaler" {
  statement {
    actions = [
      "autoscaling:DescribeAutoScalingGroups",
      "autoscaling:DescribeAutoScalingInstances",
      "autoscaling:DescribeLaunchConfigurations",
      "autoscaling:DescribeScalingActivities",
      "autoscaling:DescribeTags",
      "ec2:DescribeImages",
      "ec2:DescribeInstanceTypes",
      "ec2:DescribeLaunchTemplateVersions",
      "ec2:GetInstanceTypesFromInstanceRequirements",
      "eks:DescribeNodegroup",
    ]
    resources = ["*"]
  }

  statement {
    actions   = ["autoscaling:SetDesiredCapacity", "autoscaling:TerminateInstanceInAutoScalingGroup"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/k8s.io/cluster-autoscaler/${var.cluster_name}"
      values   = ["owned"]
    }
  }
}

resource "aws_iam_policy" "cluster_autoscaler" {
  name   = "${var.cluster_name}-cluster-autoscaler"
  policy = data.aws_iam_policy_document.cluster_autoscaler.json
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {
  policy_arn = aws_iam_policy.cluster_autoscaler.arn
  role       = aws_iam_role.cluster_autoscaler.name
}

resource "aws_eks_pod_identity_association" "cluster_autoscaler" {
  cluster_name    = var.cluster_name
  namespace       = "kube-system"
  service_account = "cluster-autoscaler"
  role_arn        = aws_iam_role.cluster_autoscaler.arn

  depends_on = [aws_eks_addon.pod_identity]
}

resource "helm_release" "cluster_autoscaler" {
  name       = "autoscaler"
  repository = "https://kubernetes.github.io/autoscaler"
  chart      = "cluster-autoscaler"
  namespace  = "kube-system"
  version    = "9.59.0"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  set {
    name  = "rbac.serviceAccount.name"
    value = "cluster-autoscaler"
  }
  set {
    name  = "autoDiscovery.clusterName"
    value = var.cluster_name
  }
  set {
    name  = "awsRegion"
    value = var.aws_region
  }

  depends_on = [
    aws_eks_pod_identity_association.cluster_autoscaler,
    aws_iam_role_policy_attachment.cluster_autoscaler,
  ]
}

# =============================================================================
# AWS Load Balancer Controller (Pod Identity)
# =============================================================================
resource "aws_iam_role" "aws_lbc" {
  name               = "${var.cluster_name}-aws-lbc"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_trust.json
}

resource "aws_iam_policy" "aws_lbc" {
  name   = "${var.cluster_name}-aws-lbc"
  policy = file("${path.module}/files/lbc-iam-policy.json")
}

resource "aws_iam_role_policy_attachment" "aws_lbc" {
  policy_arn = aws_iam_policy.aws_lbc.arn
  role       = aws_iam_role.aws_lbc.name
}

resource "aws_eks_pod_identity_association" "aws_lbc" {
  cluster_name    = var.cluster_name
  namespace       = "kube-system"
  service_account = "aws-load-balancer-controller"
  role_arn        = aws_iam_role.aws_lbc.arn

  depends_on = [aws_eks_addon.pod_identity]
}

resource "helm_release" "aws_lbc" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "3.6.1"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  set {
    name  = "clusterName"
    value = var.cluster_name
  }
  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }
  set {
    name  = "vpcId"
    value = var.vpc_id
  }
  set {
    name  = "region"
    value = var.aws_region
  }

  depends_on = [
    aws_eks_pod_identity_association.aws_lbc,
    aws_iam_role_policy_attachment.aws_lbc,
  ]
}

# =============================================================================
# Kong Gateway (NLB + ACM TLS termination)
# =============================================================================
resource "helm_release" "kong" {
  name             = "kong"
  repository       = "https://charts.konghq.com"
  chart            = "kong"
  namespace        = "kong"
  create_namespace = true
  version          = "3.4.1"

  atomic          = false
  cleanup_on_fail = true
  timeout         = 900

  values = [templatefile("${path.module}/files/kong-gateway.yaml.tftpl", {
    acm_certificate_arn = var.acm_certificate_arn
    domain              = var.route53_zone_name
  })]

  depends_on = [helm_release.aws_lbc]
}

# =============================================================================
# external-dns (Pod Identity)
# =============================================================================
resource "aws_iam_role" "external_dns" {
  name               = "${var.cluster_name}-external-dns"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_trust.json
}

data "aws_iam_policy_document" "external_dns" {
  statement {
    actions   = ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets", "route53:ListTagsForResource"]
    resources = ["arn:aws:route53:::hostedzone/${var.route53_zone_id}"]
  }
  statement {
    actions   = ["route53:ListHostedZones"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "external_dns" {
  name   = "${var.cluster_name}-external-dns"
  policy = data.aws_iam_policy_document.external_dns.json
}

resource "aws_iam_role_policy_attachment" "external_dns" {
  policy_arn = aws_iam_policy.external_dns.arn
  role       = aws_iam_role.external_dns.name
}

resource "aws_eks_pod_identity_association" "external_dns" {
  cluster_name    = var.cluster_name
  namespace       = "kube-system"
  service_account = "external-dns"
  role_arn        = aws_iam_role.external_dns.arn

  depends_on = [aws_eks_addon.pod_identity]
}

resource "helm_release" "external_dns" {
  name       = "external-dns"
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart      = "external-dns"
  namespace  = "kube-system"
  version    = "1.23.0"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  set {
    name  = "serviceAccount.name"
    value = "external-dns"
  }
  set {
    name  = "provider.name"
    value = "aws"
  }
  set {
    name  = "policy"
    value = "upsert-only"
  }
  set {
    name  = "registry"
    value = "txt"
  }
  set {
    name  = "txtOwnerId"
    value = var.cluster_name
  }
  set {
    name  = "domainFilters[0]"
    value = var.route53_zone_name
  }
  set {
    name  = "interval"
    value = "1m"
  }

  depends_on = [
    helm_release.aws_lbc,
    aws_eks_pod_identity_association.external_dns,
    aws_iam_role_policy_attachment.external_dns,
  ]
}

# =============================================================================
# cert-manager
# =============================================================================
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  version          = "v1.21.3"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  set {
    name  = "installCRDs"
    value = "true"
  }

  depends_on = [helm_release.aws_lbc]
}

# =============================================================================
# Secrets Store CSI Driver + AWS provider
# =============================================================================
resource "helm_release" "secrets_csi_driver" {
  name       = "secrets-store-csi-driver"
  repository = "https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts"
  chart      = "secrets-store-csi-driver"
  namespace  = "kube-system"
  version    = "1.6.1"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  set {
    name  = "syncSecret.enabled"
    value = "true"
  }

  depends_on = [helm_release.aws_lbc]
}

resource "helm_release" "secrets_csi_driver_aws_provider" {
  name       = "secrets-store-csi-driver-provider-aws"
  repository = "https://aws.github.io/secrets-store-csi-driver-provider-aws"
  chart      = "secrets-store-csi-driver-provider-aws"
  namespace  = "kube-system"
  version    = "3.1.4"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 600

  set {
    name  = "secrets-store-csi-driver.install"
    value = "false"
  }

  depends_on = [helm_release.secrets_csi_driver]
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
locals {
  argocd_host = "${var.argocd_subdomain}.${var.route53_zone_name}"
}

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

  # The "kong" IngressClass is created by the Kong release; it must exist first.
  # external-dns must be running to publish the record.
  depends_on = [
    helm_release.kong,
    helm_release.external_dns,
  ]
}

# =============================================================================
# Backend S3 Asset Bucket Access (Pod Identity)
#
# Grants the FastAPI backend upload access to the ecommerce asset S3 bucket.
# The backend will use this to generate presigned PUT URLs, so the frontend
# can upload product images directly to S3 without routing bytes through
# FastAPI.
#
# Permissions are scoped to s3:PutObject on objects within the asset bucket
# ARN (arn:aws:s3:::<bucket>/*). No bucket-level admin permissions are granted.
# =============================================================================
resource "aws_iam_role" "backend_s3" {
  name               = "${var.cluster_name}-backend-s3"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_trust.json
}

data "aws_iam_policy_document" "backend_s3" {
  statement {
    actions   = ["s3:PutObject"]
    resources = ["${var.backend_s3_bucket_arn}/*"]
  }
}

resource "aws_iam_policy" "backend_s3" {
  name   = "${var.cluster_name}-backend-s3"
  policy = data.aws_iam_policy_document.backend_s3.json
}

resource "aws_iam_role_policy_attachment" "backend_s3" {
  policy_arn = aws_iam_policy.backend_s3.arn
  role       = aws_iam_role.backend_s3.name
}

resource "aws_eks_pod_identity_association" "backend_s3" {
  cluster_name    = var.cluster_name
  namespace       = var.backend_namespace
  service_account = var.backend_service_account
  role_arn        = aws_iam_role.backend_s3.arn

  depends_on = [aws_eks_addon.pod_identity]
}

# =============================================================================
# kube-prometheus-stack (Prometheus + Grafana)
#
# Deploys the full monitoring stack: Prometheus, Alertmanager, Grafana,
# node-exporter, and kube-state-metrics.  Grafana is exposed internally
# through Kong at https://grafana.<zone>.
# =============================================================================
locals {
  grafana_host = "grafana.${var.route53_zone_name}"
}

resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "72.2.0"

  atomic          = true
  cleanup_on_fail = true
  timeout         = 900

  values = [yamlencode({
    # -- Grafana settings ---------------------------------------------------
    grafana = {
      enabled = true
      ingress = {
        enabled          = true
        ingressClassName = "kong"
        hosts            = [local.grafana_host]
        path             = "/"
        pathType         = "Prefix"
      }

      # Default admin credentials (override in production)
      adminUser     = var.grafana_admin_user
      adminPassword = var.grafana_admin_password

      # Persist dashboards across restarts
      persistence = {
        enabled = true
        size    = "10Gi"
      }

      # Sidecar to auto-load ConfigMap dashboards
      sidecar = {
        dashboards = {
          enabled = true
        }
      }
    }

    # -- Prometheus settings ------------------------------------------------
    prometheus = {
      enabled = true

      prometheusSpec = {
        # Scrape metrics from all pods with prometheus.io/scrape annotations
        podMonitorSelectorNilUsesHelmValues     = false
        serviceMonitorSelectorNilUsesHelmValues = false

        retention     = "15d"
        retentionSize = "20GB"

        resources = {
          requests = {
            cpu    = "300m"
            memory = "1Gi"
          }
          limits = {
            cpu    = "1"
            memory = "3Gi"
          }
        }

        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              accessModes      = ["ReadWriteOnce"]
              storageClassName = "gp3"
              resources = {
                requests = {
                  storage = "30Gi"
                }
              }
            }
          }
        }
      }
    }

    # -- Alertmanager settings ----------------------------------------------
    alertmanager = {
      enabled = true
    }

    # -- Optional: kube-state-metrics & node-exporter are enabled by default
  })]

  depends_on = [
    helm_release.kong,
    helm_release.external_dns,
    kubernetes_storage_class_v1.ebs_gp3,
  ]
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
# A trigger of sha256 ensures the manifest is re-applied whenever the
# template content, repo URL, or target revision changes.
# =============================================================================
locals {
  apps_manifest = templatefile("${path.module}/files/apps.yaml.tftpl", {
    repo_url        = var.repo_url
    target_revision = var.target_revision
  })
}

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
locals {
  ecommerce_secret_manifest = templatefile("${path.module}/files/ecommerce-secret.yaml.tftpl", {
    namespace         = var.backend_namespace
    database_url      = var.database_url
    secret_key        = var.secret_key
    postgres_password = var.postgres_password
  })
}

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

  depends_on = [helm_release.argocd]
}

# =============================================================================
# Kong Routes Bootstrap
#
# Renders kong-routes.yaml from the template and applies it with kubectl after
# Kong is deployed and its CRDs are registered.
# =============================================================================
locals {
  kong_routes_manifest = templatefile("${path.module}/files/kong-routes.yaml.tftpl", {
    namespace         = var.backend_namespace
    route53_zone_name = var.route53_zone_name
  })
}

resource "null_resource" "kong_routes" {
  triggers = {
    manifest_sha256 = sha256(local.kong_routes_manifest)
    kong_ready      = helm_release.kong.id
  }

  # Wait for the Kong Deployment to be available, then apply the routes.
  provisioner "local-exec" {
    command     = <<-EOT
      kubectl wait --for=condition=available deployment/kong \
        -n kong --timeout=600s 2>/dev/null
      echo '${local.kong_routes_manifest}' | kubectl apply -f -
    EOT
    interpreter = ["/bin/bash", "-c"]
  }

  depends_on = [helm_release.kong]
}



