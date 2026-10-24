output "ebs_csi_role_arn" {
  description = "ARN of the EBS CSI driver IAM role"
  value       = aws_iam_role.ebs_csi_driver.arn
}

output "ebs_csi_role_name" {
  description = "Name of the EBS CSI driver IAM role"
  value       = aws_iam_role.ebs_csi_driver.name
}
