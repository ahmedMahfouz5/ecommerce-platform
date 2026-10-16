# E-Commerce Platform

A modular e-commerce platform built incrementally as a DevOps portfolio project.

**Tech Stack:** FastAPI (Python), React (TypeScript), PostgreSQL, Docker

---

## Prerequisites

- Docker and Docker Compose v2+
- Git

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd ecommerce-platform

# 2. Create environment configuration
cp env.example .env
# (Optionally edit .env to change passwords and keys)

# 3. Start all services
docker compose up --build
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

## Verifying the Setup

```bash
# Check backend health (includes database connectivity)
curl http://localhost:8000/api/v1/health

# Expected response:
# {"status":"ok","database":"connected"}
```

## Project Structure

```
ecommerce-platform/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py          # App factory and configuration
│   │   ├── config.py        # Environment-based settings
│   │   ├── core/
│   │   │   └── database.py  # Async database engine
│   │   └── routers/
│   │       └── health.py    # Health check endpoint
│   ├── alembic/             # Database migrations (scaffolded)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml       # Local development stack
├── env.example              # Environment variable template
└── README.md
```

## Development

- Backend code is bind-mounted and reloads on changes (Uvicorn `--reload`).
- Frontend code is bind-mounted with Vite HMR.
- Database data persists in a Docker volume.

## Stopping

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## Kubernetes Deployment (Helm)

The platform is split into three independent Helm charts:

| Chart | Release | Purpose |
|-------|---------|---------|
| `helm/postgres` | `postgres` | PostgreSQL StatefulSet (local/CI only — production uses RDS) |
| `helm/backend` | `backend` | FastAPI backend + Alembic migration Job |
| `helm/frontend` | `frontend` | nginx + React SPA |

### Prerequisites

- A Kubernetes cluster (kind, minikube, or cloud)
- `kubectl` and `helm` (v4+)

### Secret

Create the external Secret before installing any chart:

```bash
kubectl create secret generic ecommerce-secret \
  --from-literal=DATABASE_URL='postgresql+asyncpg://postgres:<password>@postgres:5432/ecommerce' \
  --from-literal=SECRET_KEY='<random-secret-key>' \
  --from-literal=postgres-password='<password>'
```

### Install (in order)

```bash
helm upgrade --install postgres helm/postgres --wait
helm upgrade --install backend helm/backend \
  --set image.tag=<sha> --wait
helm upgrade --install frontend helm/frontend \
  --set image.tag=<sha> --wait
```

### Access

```bash
kubectl port-forward svc/backend 8000:8000
kubectl port-forward svc/frontend 8080:8080
```

Then:

```bash
curl http://localhost:8000/api/v1/health/live
curl http://localhost:8000/api/v1/health/ready
curl http://localhost:8000/api/v1/products
curl http://localhost:8080/api/v1/products
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and
[semantic versioning](https://semver.org/) driven by
[Release Please](https://github.com/googleapis/release-please).

Every pull request title must follow this format:

```
type: short description
```

Allowed **types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`.

Examples:

```
feat: add product search endpoint
fix: handle empty product list returning 500
docs: explain commit convention in README
chore: upgrade postgres image to 16.4
```

Breaking changes use `!` after the type or a `BREAKING CHANGE:` footer:

```
feat!: drop support for Python 3.11
```

PRs are squash-merged, so the PR title becomes the commit message on
`master`. A PR-title check workflow enforces this format on every PR.

## Milestones

| Milestone | Status |
|-----------|--------|
| 0 - Project Scaffolding | ✅ Complete |
| 1 - Product Catalog | ⬜ Pending |
| 2 - User Authentication | ⬜ Pending |
| 3 - Shopping Cart | ⬜ Pending |
| 4 - Order Management | ⬜ Pending |
| 5 - Containerization & Polish | ⬜ Pending |