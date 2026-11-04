variable "route53_zone_name" {
  description = "Route 53 public hosted zone name (e.g., example.com)"
  type        = string
}

variable "argocd_subdomain" {
  description = "Subdomain for Argo CD; final host is <argocd_subdomain>.<route53_zone_name>"
  type        = string
  default     = "argocd"
}

variable "repo_url" {
  description = "Git repository URL for the Argo CD child applications"
  type        = string
  default     = "https://github.com/ahmedMahfouz5/ecommerce-platform.git"
}

variable "target_revision" {
  description = "Git branch/tag/revision for the Argo CD child applications"
  type        = string
  default     = "main"
}

variable "backend_namespace" {
  description = "Kubernetes namespace where the backend secret is created"
  type        = string
  default     = "prod"
}

variable "database_url" {
  description = "Database connection URL for the FastAPI backend"
  type        = string
  sensitive   = true
  default     = "postgresql+asyncpg://postgres:password@postgres:5432/ecommerce"
}

variable "secret_key" {
  description = "Secret key used by FastAPI for JWT signing"
  type        = string
  sensitive   = true
  default     = "password"
}

variable "postgres_password" {
  description = "PostgreSQL password shared between backend and postgres chart"
  type        = string
  sensitive   = true
  default     = "password"
}
