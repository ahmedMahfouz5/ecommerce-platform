# =============================================================================
# EBS CSI Driver IAM (IRSA)
# =============================================================================

locals {
  oidc_host = replace(var.oidc_issuer, "https://", "")
}

data "aws_iam_policy_document" "ebs_csi_driver_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ebs_csi_driver" {
  name               = "${var.cluster_name}-ebs-csi-driver"
  assume_role_policy = data.aws_iam_policy_document.ebs_csi_driver_trust.json
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi_driver.name
}

# -----------------------------------------------------------------------------
# Optional: only needed when volumes use a customer-managed KMS key.
# The default aws/ebs key does not need this.
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "ebs_csi_driver_kms" {
  count = length(var.kms_key_arns) > 0 ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey",
    ]
    resources = var.kms_key_arns
  }

  statement {
    effect    = "Allow"
    actions   = ["kms:CreateGrant", "kms:ListGrants", "kms:RevokeGrant"]
    resources = var.kms_key_arns

    condition {
      test     = "Bool"
      variable = "kms:GrantIsForAWSResource"
      values   = ["true"]
    }
  }
}

resource "aws_iam_policy" "ebs_csi_driver_kms" {
  count  = length(var.kms_key_arns) > 0 ? 1 : 0
  name   = "${var.cluster_name}-ebs-csi-driver-kms"
  policy = data.aws_iam_policy_document.ebs_csi_driver_kms[0].json
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver_kms" {
  count      = length(var.kms_key_arns) > 0 ? 1 : 0
  policy_arn = aws_iam_policy.ebs_csi_driver_kms[0].arn
  role       = aws_iam_role.ebs_csi_driver.name
}
