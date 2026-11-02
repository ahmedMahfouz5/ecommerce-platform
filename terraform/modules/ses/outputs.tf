output "ses_domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = aws_sesv2_email_identity.domain.arn
}

output "ses_configuration_set_name" {
  description = "SES configuration set name"
  value       = aws_sesv2_configuration_set.main.configuration_set_name
}

output "sender_email" {
  description = "SES sender email"
  value       = var.sender_email
}

output "ses_iam_policy_arn" {
  description = "IAM policy attached to the backend role"
  value       = aws_iam_policy.ses_send_email.arn
}

output "dkim_records" {
  description = "DKIM DNS records to configure"
  value = [
    for token in aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens : {
      name  = "${token}._domainkey.${var.domain_name}"
      type  = "CNAME"
      value = "${token}.dkim.amazonses.com"
    }
  ]
}
