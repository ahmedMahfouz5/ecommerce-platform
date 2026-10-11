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

## Milestones

| Milestone | Status |
|-----------|--------|
| 0 - Project Scaffolding | ✅ Complete |
| 1 - Product Catalog | ⬜ Pending |
| 2 - User Authentication | ⬜ Pending |
| 3 - Shopping Cart | ⬜ Pending |
| 4 - Order Management | ⬜ Pending |
| 5 - Containerization & Polish | ⬜ Pending |