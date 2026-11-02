# --------------------------------------------------
# SES DOMAIN IDENTITY
# --------------------------------------------------

resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.domain_name

  tags = var.tags
}

# --------------------------------------------------
# SES CONFIGURATION SET
# --------------------------------------------------

resource "aws_sesv2_configuration_set" "main" {
  configuration_set_name = "ecommerce-transactional"

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }

  tags = var.tags
}

# --------------------------------------------------
# SES DOMAIN IDENTITY CONFIGURATION
# --------------------------------------------------

resource "aws_sesv2_email_identity" "sender" {
  email_identity         = var.sender_email
  configuration_set_name = aws_sesv2_configuration_set.main.configuration_set_name

  tags = var.tags
}

# --------------------------------------------------
# ROUTE53 DKIM RECORDS
# --------------------------------------------------

resource "aws_route53_record" "dkim" {
  count = var.create_dns_records ? 3 : 0

  zone_id = var.zone_id

  name = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain_name}"

  type = "CNAME"
  ttl  = 600

  records = [
    "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"
  ]
}

# --------------------------------------------------
# IAM POLICY FOR EKS BACKEND
# --------------------------------------------------

resource "aws_iam_policy" "ses_send_email" {
  name        = "ecommerce-backend-ses-send-email"
  description = "Allow EKS backend to send transactional emails through SES"

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]

        Resource = "*"

        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.sender_email
          }
        }
      }
    ]
  })

  tags = var.tags
}

# Attach permissions to the existing EKS backend role.

resource "aws_iam_role_policy_attachment" "backend_ses" {
  role       = var.backend_pod_identity_role_name
  policy_arn = aws_iam_policy.ses_send_email.arn
}
