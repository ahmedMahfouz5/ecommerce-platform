output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value = [
    aws_subnet.private_zone1.id,
    aws_subnet.private_zone2.id,
  ]
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value = [
    aws_subnet.public_zone1.id,
    aws_subnet.public_zone2.id,
  ]
}

output "nat_gateway_ids" {
  description = "IDs of the NAT gateway(s)"
  value       = aws_nat_gateway.nat[*].id
}

output "nat_gateway_id" {
  description = "ID of the primary NAT gateway (backwards-compatible)"
  value       = aws_nat_gateway.nat[0].id
}
