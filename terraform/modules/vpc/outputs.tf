output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT gateway(s)"
  value       = aws_nat_gateway.nat[*].id
}

output "nat_gateway_id" {
  description = "ID of the primary NAT gateway (backwards-compatible)"
  value       = aws_nat_gateway.nat[0].id
}

output "private_subnet_ids" { value = [for az in var.availability_zones : aws_subnet.private[az].id] }
output "public_subnet_ids" { value = [for az in var.availability_zones : aws_subnet.public[az].id] }
output "vpc_cidr" { value = aws_vpc.main.cidr_block }
output "private_route_table_ids" { value = [for rt in aws_route_table.private : rt.id] }
output "nat_public_ips" { value = aws_eip.nat[*].public_ip }
# keep vpc_id and nat_gateway_id as they are
