output "efs_filesystem_id" {
  description = "ID of the EFS file system"
  value       = aws_efs_file_system.eks.id
}

output "efs_csi_role_arn" {
  description = "ARN of the EFS CSI driver IAM role"
  value       = aws_iam_role.efs_csi_driver.arn
}
