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
#   client --HTTPS--> NLB (ACM wildcard cert, TLS terminated)
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
