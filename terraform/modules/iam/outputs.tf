output "developer_iam_user_arn" {
  description = "ARN of the developer IAM user"
  value       = aws_iam_user.developer.arn
}

output "eks_admin_role_arn" {
  description = "ARN of the EKS admin IAM role"
  value       = aws_iam_role.eks_admin.arn
}

output "myapp_secrets_role_arn" {
  description = "ARN of the IAM role for myapp Secrets Manager access"
  value       = aws_iam_role.myapp_secrets.arn
}

output "github_actions_terraform_role_arn" {
  description = "ARN of the GitHub Actions Terraform IAM role"
  value       = data.aws_iam_role.github_actions_terraform.arn
}

