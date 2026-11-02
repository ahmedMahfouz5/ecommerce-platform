output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.this.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.this.arn
}

output "distribution_domain_name" {
  description = "CloudFront domain name (e.g., xxxxx.cloudfront.net)"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route 53 alias records"
  value       = "Z2FDTNDATAQYW2"
}

output "origin_access_control_id" {
  description = "ID of the Origin Access Control (OAC)"
  value       = aws_cloudfront_origin_access_control.s3.id
}

output "cache_policy_id" {
  description = "ID of the CloudFront cache policy"
  value       = aws_cloudfront_cache_policy.assets.id
}

output "invalidation_command" {
  description = "AWS CLI command used to create the latest invalidation (if enabled)"
  value       = var.invalidation_items != null && length(var.invalidation_items) > 0 ? "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.this.id}" : null
}
