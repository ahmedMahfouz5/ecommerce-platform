output "bucket_name" {
  description = "Name of the S3 asset bucket"
  value       = aws_s3_bucket.assets.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 asset bucket"
  value       = aws_s3_bucket.assets.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 asset bucket (useful for SDK clients and VPC endpoints)"
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}
