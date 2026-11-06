# GitHub Actions Workflows

This directory contains CI/CD workflows for the e-commerce platform, covering infrastructure (Terraform), application builds (Docker), and Helm chart validation.

## Workflow Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **Terraform** | `terraform.yml` | Manual dispatch, PR paths (commented) | Plans and applies infrastructure changes |
| **Terraform Destroy** | `terraform-destroy.yml` | Manual dispatch | Safely destroys infrastructure with confirmation |
| **Release Backend** | `release-backend.yml` | Push/PR to `main` on `backend/**` changes | Builds, tests, and releases backend container |
| **Release Frontend** | `release-frontend.yml` | Push/PR to `main` on `frontend/**` changes | Builds, tests, and releases frontend container |
| **Helm Test** | `helm-test.yml` | Manual dispatch | Lints, validates, and smoke-tests Helm charts |

---

## Terraform Workflow (`terraform.yml`)

Manages AWS infrastructure using Terraform with OIDC-based AWS authentication.

### Triggers
- **Manual** (`workflow_dispatch`)
- **PR** (commented out): Plans only on PRs touching `terraform/**`

### Jobs

| Job | Purpose | Key Steps |
|-----|---------|-----------|
| `plan` | Validates and plans changes | Format check, Init, Validate, Trivy scan, Plan |
| `apply` | Applies changes to production | Staged apply (VPC → EKS → IAM → Remaining) |

### Staged Apply Order
```
1. module.vpc     → VPC, subnets, IGW, NAT
2. module.eks     → EKS cluster, node groups
3. module.iam     → IAM users, roles, access entries
4. All remaining  → Add-ons, ArgoCD, S3, CloudFront, SES
```

### Required Secrets/Variables
| Name | Description |
|------|-------------|
| `TF_PLAN_ROLE_ARN` | IAM role ARN for plan job (default in workflow) |
| `TF_APPLY_ROLE_ARN` | IAM role ARN for apply job (default in workflow) |

### Environment Protection
- Apply job requires `prod` environment approval (Settings > Environments)
- Concurrency group `terraform-prod` prevents concurrent runs

---

## Terraform Destroy Workflow (`terraform-destroy.yml`)

**⚠️ Destructive Operation**: Completely removes all Terraform-managed infrastructure.

### Triggers
- **Manual** (`workflow_dispatch`) with confirmation input

### Workflow

| Stage | Job | Protection |
|-------|-----|------------|
| 1 | `plan-destroy` | Generates and uploads destroy plan artifact |
| 2 | `destroy` | Requires `prod-destroy` environment approval |

### Usage
1. Navigate to Actions > Terraform Destroy
2. Type `destroy` in the confirmation field
3. Review the generated plan in the job summary
4. Approve the `prod-destroy` environment to execute

### Safety Features
- Confirmation text required (`"destroy"`)
- Plan artifact saved for review
- Separate environment (`prod-destroy`) for manual approval
- Shared concurrency group with apply workflow

---

## Release Backend Workflow (`release-backend.yml`)

Builds, scans, and releases the FastAPI backend container image.

### Triggers
- Push to `main` with changes in `backend/**`
- Pull requests touching `backend/**`
- Manual dispatch with optional force build

### Jobs

| Job | Depends On | Purpose |
|-----|------------|---------|
| `release-please` | — | Manages release PRs and versioning |
| `detect-changes` | — | Detects if backend files changed |
| `trivy-fs-scan` | — | Scans source code for vulnerabilities |
| `docker-push` | Above jobs | Builds, tests, scans, and pushes image |
| `update-helm-values` | `docker-push` | Updates Helm values with new tag (GitOps) |

### Image Tags
- `{{sha}}` — Git commit SHA (always applied)
- `{{version}}` — Semantic version from release-please (releases only)
- `{{major}}.{{minor}}` — Major.minor version (releases only)
- `{{major}}` — Major version only (releases only)

### Security Scans
| Scan | Type | Severity Threshold |
|------|------|-------------------|
| Filesystem (trivy-fs-scan) | Source code | CRITICAL, HIGH |
| Image (docker-push) | Built image | CRITICAL, HIGH |

### Outputs
- Docker image pushed to `ahmedmahfouz0/backend`
- Helm values updated in `helm/backend/values.yaml`
- Migration job updated in `migration/job.yaml`

---

## Release Frontend Workflow (`release-frontend.yml`)

Builds, scans, and releases the Next.js frontend container image.

### Triggers
- Push to `main` with changes in `frontend/**`
- Pull requests touching `frontend/**`
- Manual dispatch with optional force build

### Jobs

| Job | Depends On | Purpose |
|-----|------------|---------|
| `release-please` | — | Manages release PRs and versioning |
| `detect-changes` | — | Detects if frontend files changed |
| `trivy-fs-scan` | — | Scans source code for vulnerabilities |
| `docker-push` | Above jobs | Builds, tests, scans, and pushes image |
| `update-helm-values` | `docker-push` | Updates Helm values with new tag (GitOps) |

### Image Tags
Same tagging strategy as backend: SHA + semantic versions on releases.

### Build Args
| Arg | Value |
|-----|-------|
| `REVISION` | Git commit SHA |
| `VERSION` | Release version or `dev` |

### Outputs
- Docker image pushed to `ahmedmahfouz0/frontend`
- Helm values updated in `helm/frontend/values.yaml`

### Notes
- Shares `helm-values-update` concurrency group with backend to prevent conflicts
- Includes separate frontend smoke test script

---

## Helm Test Workflow (`helm-test.yml`)

Validates Helm charts through linting, template validation, and integration testing.

### Triggers
- Manual dispatch with optional debug SSH
- PR/push (commented out)

### Jobs

| Job | Purpose | Chart Coverage |
|-----|---------|----------------|
| `lint` | Helm lint + kubeconform validation | postgresql, backend (all envs), frontend (all envs) |
| `trivy-config` | Scans rendered manifests | All charts |
| `trivy-fs` | Scans chart source | postgresql, backend, frontend |
| `kind-install` | Integration test on Kind cluster | Full stack: postgres + backend + frontend |

### Lint Matrix
Tests multiple value files per chart:
- `values.yaml` — Base configuration
- `values-dev.yaml` — Development environment
- `values-staging.yaml` — Staging environment  
- `values-prod.yaml` — Production environment
- `values-local.yaml` — PostgreSQL local setup

### Kind Integration Test Steps
1. Create Kind cluster (`ecommerce-ci`)
2. Create Kubernetes secret with test credentials
3. Install PostgreSQL and wait for readiness
4. Run database migration job
5. Install backend and frontend
6. Execute smoke tests via port-forward

### Smoke Tests
| Endpoint | Expected |
|----------|----------|
| `localhost:8000/api/v1/health/live` | 200 OK |
| `localhost:8000/api/v1/health/ready` | 200 OK |
| `localhost:8000/api/v1/products` | 200 OK (JSON) |
| `localhost:8080/healthz` | 200 OK |
| `localhost:8080/api/v1/products` | Proxied to backend |
| `localhost:8080/` | Static assets served |

### Debug Feature
If tests fail and `debug_ssh` is enabled, opens a tmate SSH session for interactive debugging.

---

## Required Repository Secrets

Configure these in Settings > Secrets and variables > Actions:

| Secret | Used By | Description |
|--------|---------|-------------|
| `DOCKERHUB_USERNAME` | release-backend, release-frontend | Docker Hub login |
| `DOCKERHUB_TOKEN` | release-backend, release-frontend | Docker Hub access token |
| `GITHUB_TOKEN` | release-please | Auto-provided, used for releases |

### Optional Variables

Configure in Settings > Secrets and variables > Actions > Variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TF_PLAN_ROLE_ARN` | Hardcoded in workflow | IAM role for Terraform plan |
| `TF_APPLY_ROLE_ARN` | Hardcoded in workflow | IAM role for Terraform apply |

---

## Concurrency Groups

Prevents conflicting simultaneous runs:

| Group | Workflows |
|-------|-----------|
| `terraform-prod` | terraform.yml, terraform-destroy.yml |
| `release-backend` | release-backend.yml |
| `release-frontend` | release-frontend.yml |
| `helm-values-update` | release-backend.yml (update-helm-values job), release-frontend.yml (update-helm-values job) |
| `{{ github.workflow }}-${{ github.ref }}` | helm-test.yml |

---

## Workflow Dependencies

```
release-backend/frontend:
  ├─ release-please ────────────┐
  ├─ detect-changes ────────────┤
  ├─ trivy-fs-scan ──────────────┤
  │                              ▼
  │                        docker-push
  │                              │
  │                              ▼
  │                        update-helm-values
  │
  └─ (concurrency: helm-values-update)

helm-test:
  ├─ lint ─────────────────────┐
  │                              ▼
  ├─ trivy-config (needs: lint)
  ├─ trivy-fs (needs: lint)
  └─ kind-install (needs: lint)

terraform:
  ├─ plan ─────────────────────┐
  │                              ▼
  └─ apply (needs: plan, env: prod)

terraform-destroy:
  ├─ plan-destroy ───────────────┐
  │                              ▼
  └─ destroy (needs: plan-destroy, env: prod-destroy)
```

---

## Development Notes

### Adding a New Workflow
1. Create `.yml` file in `.github/workflows/`
2. Follow existing naming conventions (`kebab-case`)
3. Add appropriate concurrency group if resource conflicts possible
4. Document in this README

### Modifying Existing Workflows
- Test changes on a branch before merging to `main`
- Use `workflow_dispatch` for manual testing
- Check concurrency rules don't block legitimate parallel runs

### Troubleshooting

**Terraform state lock errors**
```bash
# Manually release lock (requires lock ID)
terraform force-unlock LOCK_ID
```

**Docker build cache issues**
- Cache scopes are per-component (`backend`, `frontend`)
- Use `mode=max` for layer caching
- Clear GitHub Actions cache if needed: Settings > Caches

**Helm test failures in Kind**
- Enable `debug_ssh` option for interactive debugging
- Check Kind logs: `kind export logs`
- Verify Kubernetes events in debug output

**release-please conflicts**
- Both release workflows run release-please against same config
- Consider consolidating to single workflow if racing occurs
