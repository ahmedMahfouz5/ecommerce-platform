aws_region           = "us-east-2"
env                  = "staging"
eks_name             = "demo"
eks_version          = "1.31"
availability_zones   = ["us-east-2a", "us-east-2b"]
vpc_cidr             = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.0.0/19", "10.0.32.0/19"]
public_subnet_cidrs  = ["10.0.64.0/19", "10.0.96.0/19"]

# Route 53
# -- The domain you own in Route 53. If you do not own one, create a public
#    hosted zone in AWS (Route 53 Console → Create hosted zone → enter domain).
#    This is MANDATORY for the architecture.
route53_zone_name = "example.com"

# NAT Gateway configuration
nat_gateway_count = 1

