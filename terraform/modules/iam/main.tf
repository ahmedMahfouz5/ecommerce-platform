data "aws_region" "current" {}

locals {
  prefix      = "${var.env}-${var.eks_name}"
  oidc_host   = replace(var.oidc_issuer, "https://", "")
  cluster_arn = "arn:aws:eks:${data.aws_region.current.name}:${var.account_id}:cluster/${var.cluster_name}"
  secret_arns = coalesce(var.myapp_secret_arns, ["arn:aws:secretsmanager:${data.aws_region.current.name}:${var.account_id}:secret:${var.env}/myapp/*"])
}

# =============================================================================
# Developer (read-only)
# =============================================================================
resource "aws_iam_user" "developer" {
  name = "${local.prefix}-developer"
}

data "aws_iam_policy_document" "developer" {
  statement {
    actions   = ["eks:DescribeCluster"]
    resources = [local.cluster_arn]
  }
  statement {
    actions   = ["eks:ListClusters"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "developer_eks" {
  name   = "${local.prefix}-developer-eks"
  policy = data.aws_iam_policy_document.developer.json
}

resource "aws_iam_user_policy_attachment" "developer_eks" {
  user       = aws_iam_user.developer.name
  policy_arn = aws_iam_policy.developer_eks.arn
}

resource "aws_eks_access_entry" "developer" {
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_user.developer.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "developer" {
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_user.developer.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.developer]
}

# =============================================================================
# Manager (admin via assumed role)
# =============================================================================
resource "aws_iam_user" "manager" {
  name = "${local.prefix}-manager"
}

data "aws_iam_policy_document" "eks_admin_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = [aws_iam_user.manager.arn]
    }

    dynamic "condition" {
      for_each = var.require_mfa ? [1] : []
      content {
        test     = "Bool"
        variable = "aws:MultiFactorAuthPresent"
        values   = ["true"]
      }
    }
  }
}

resource "aws_iam_role" "eks_admin" {
  name               = "${local.prefix}-eks-admin"
  assume_role_policy = data.aws_iam_policy_document.eks_admin_trust.json
}

data "aws_iam_policy_document" "eks_admin" {
  statement {
    actions = [
      "eks:Describe*",
      "eks:List*",
      "eks:AccessKubernetesApi",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "eks_admin" {
  name   = "${local.prefix}-eks-admin"
  policy = data.aws_iam_policy_document.eks_admin.json
}

resource "aws_iam_role_policy_attachment" "eks_admin" {
  role       = aws_iam_role.eks_admin.name
  policy_arn = aws_iam_policy.eks_admin.arn
}

data "aws_iam_policy_document" "assume_admin" {
  statement {
    actions   = ["sts:AssumeRole"]
    resources = [aws_iam_role.eks_admin.arn]
  }
}

resource "aws_iam_policy" "eks_assume_admin" {
  name   = "${local.prefix}-assume-eks-admin"
  policy = data.aws_iam_policy_document.assume_admin.json
}

resource "aws_iam_user_policy_attachment" "manager" {
  user       = aws_iam_user.manager.name
  policy_arn = aws_iam_policy.eks_assume_admin.arn
}

resource "aws_eks_access_entry" "manager" {
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_role.eks_admin.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "manager" {
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_role.eks_admin.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.manager]
}

# =============================================================================
# Terraform user (EKS access policies)
# =============================================================================
resource "aws_eks_access_entry" "terraform" {
  cluster_name  = var.cluster_name
  principal_arn = "arn:aws:iam::${var.account_id}:user/${var.terraform_user_name}"
  type          = "STANDARD"
}

locals {
  terraform_eks_policies = toset([
    "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy",
    "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy",
    "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy",
    "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy",
  ])
}

resource "aws_eks_access_policy_association" "terraform" {
  for_each = local.terraform_eks_policies

  cluster_name  = var.cluster_name
  principal_arn = aws_eks_access_entry.terraform.principal_arn
  policy_arn    = each.value

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.terraform]
}

# =============================================================================
# GitHub Actions Terraform role (EKS access policies on an EXISTING role)
# =============================================================================
# The role "github-actions-terraform" already exists (created outside Terraform).
# We only add the EKS access entry + policies.
#
# IMPORTANT: If the access entry already exists on the cluster (created outside
# Terraform), import it FIRST before applying:
#
#   terraform import \
#     'module.iam.aws_eks_access_entry.github_actions_terraform' \
#     '<cluster-name>:arn:aws:iam::<account-id>:role/github-actions-terraform'
#
# data "aws_iam_role" "github_actions_terraform" {
#   name = "github-actions-terraform"
# }

# resource "aws_eks_access_entry" "github_actions_terraform" {
#   cluster_name  = var.cluster_name
#   principal_arn = data.aws_iam_role.github_actions_terraform.arn
#   type          = "STANDARD"
# }

# locals {
#   github_actions_terraform_eks_policies = toset([
#     "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy",
#     "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy",
#     "arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy",
#     "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy",
#   ])
# }

# resource "aws_eks_access_policy_association" "github_actions_terraform" {
#   for_each = local.github_actions_terraform_eks_policies

#   cluster_name  = var.cluster_name
#   principal_arn = aws_eks_access_entry.github_actions_terraform.principal_arn
#   policy_arn    = each.value

#   access_scope {
#     type = "cluster"
#   }

#   depends_on = [aws_eks_access_entry.github_actions_terraform]
# }

# =============================================================================
# App IRSA role: Secrets Manager read
# =============================================================================
data "aws_iam_policy_document" "myapp_secrets_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["system:serviceaccount:${var.myapp_namespace}:${var.myapp_service_account}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "myapp_secrets" {
  name               = "${var.cluster_name}-myapp-secrets"
  assume_role_policy = data.aws_iam_policy_document.myapp_secrets_trust.json
}

data "aws_iam_policy_document" "myapp_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = local.secret_arns
  }
}

resource "aws_iam_policy" "myapp_secrets" {
  name   = "${var.cluster_name}-myapp-secrets"
  policy = data.aws_iam_policy_document.myapp_secrets.json
}

resource "aws_iam_role_policy_attachment" "myapp_secrets" {
  role       = aws_iam_role.myapp_secrets.name
  policy_arn = aws_iam_policy.myapp_secrets.arn
}

