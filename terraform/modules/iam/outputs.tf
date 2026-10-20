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
