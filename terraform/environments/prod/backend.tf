terraform {
  backend "s3" {
    bucket       = "terraform-state-bucket-19-10-2026"
    key          = "environments/prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
