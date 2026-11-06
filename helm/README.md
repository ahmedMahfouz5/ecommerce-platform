# E-Commerce Platform Helm Charts

Production-grade Helm charts for deploying a full-stack e-commerce application on Kubernetes.

![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)
![Helm](https://img.shields.io/badge/helm-%230f1689.svg?style=for-the-badge&logo=helm&logoColor=white)
![FastAPI](https://img.shields.io/badge/fastapi-%23009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

## Overview

This repository contains Helm charts for deploying a modern e-commerce platform consisting of:

- **Frontend**: React SPA served by Nginx (unprivileged)
- **Backend**: FastAPI-based REST API with Alembic migrations
- **Primary Database**: PostgreSQL for relational data
- **Document Store**: MongoDB for NoSQL/document storage

## Architecture

```
                    ┌─────────────────────┐
                    │     Ingress NGINX   │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    Frontend     │   │     Backend     │   │   Monitoring    │
│ (Nginx + React) │   │    (FastAPI)    │   │  (Prometheus/   │
└────────┬────────┘   └────────┬────────┘   │   Grafana)      │
         │                     │            └─────────────────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    MongoDB      │   │   PostgreSQL    │   │   AWS Services  │
│   (Document)    │   │   (Relational)  │   │  (S3, SES, CDN) │
│                 │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Chart Structure

```
helm/
├── backend/              # FastAPI backend chart
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-staging.yaml
│   ├── values-prod.yaml
│   └── templates/
├── frontend/             # Nginx + React frontend chart
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-prod.yaml
│   └── templates/
├── mongodb/              # Bitnami MongoDB chart
│   └── ...
└── postgresql/           # Bitnami PostgreSQL chart
│   └── ...
```

## Prerequisites

- Kubernetes cluster (>= 1.28)
- Helm 3.x
- kubectl configured
- Ingress Controller (e.g., NGINX Ingress Controller)

## Quick Start

### 1. Clone and Navigate

```bash
cd helm/
```

### 2. Deploy Databases

Deploy PostgreSQL:
```bash
helm dependency build postgresql/
helm install postgres postgresql/ --namespace database --create-namespace
```

Deploy MongoDB:
```bash
helm dependency build mongodb/
helm install mongodb mongodb/ --namespace database --create-namespace
```

### 3. Create Secrets

Create the application secrets:

```bash
kubectl create secret generic ecommerce-secret \
  --from-literal=DATABASE_URL="postgresql://user:password@postgres-postgresql.database.svc.cluster.local:5432/ecommerce" \
  --from-literal=SECRET_KEY="your-super-secret-key" \
  --from-literal=mongodb-passwords="mongo-password" \
  --namespace default
```

### 4. Deploy Application

Development:
```bash
helm install backend backend/ -f backend/values-dev.yaml --set secrets.create=false
helm install frontend frontend/ -f frontend/values-dev.yaml
```

Production:
```bash
helm install backend backend/ -f backend/values-prod.yaml --set secrets.create=false
helm install frontend frontend/ -f frontend/values-prod.yaml
```

## Configuration

### Backend (FastAPI)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Container image | `ahmedmahfouz0/backend` |
| `replicaCount` | Number of replicas | `1` |
| `config.port` | Application port | `8000` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `256Mi` |
| `hpa.enabled` | Enable HPA | `false` |
| `ingress.enabled` | Enable Ingress | `false` |
| `probes.liveness.path` | Liveness probe path | `/api/v1/health/live` |
| `probes.readiness.path` | Readiness probe path | `/api/v1/health/ready` |

See [backend/values.yaml](backend/values.yaml) for complete configuration options.

### Frontend (Nginx + React)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Container image | `ahmedmahfouz0/frontend` |
| `replicaCount` | Number of replicas | `1` |
| `service.port` | Service port | `8080` |
| `backendUrl` | Backend service URL | `http://backend:8000` |
| `nginx.proxyReadTimeout` | Proxy timeout | `60s` |
| `resources.requests.cpu` | CPU request | `50m` |
| `resources.requests.memory` | Memory request | `64Mi` |

See [frontend/values.yaml](frontend/values.yaml) for complete configuration options.

### PostgreSQL (Bitnami)

```yaml
postgresql:
  fullnameOverride: postgres
  database: ecommerce
  username: postgres
  persistence:
    enabled: true
    size: 10Gi
```

See [postgresql/README.md](postgresql/README.md) and [postgresql/values.yaml](postgresql/values.yaml).

### MongoDB (Bitnami)

```yaml
mongodb:
  fullnameOverride: mongodb
  auth:
    database: ecommerce
  persistence:
    enabled: true
    size: 8Gi
```

See [mongodb/README.md](mongodb/README.md) and [mongodb/values.yaml](mongodb/values.yaml).

## Environment-Specific Values

### Development
- Single replicas for all services
- Resource limits reduced
- HPA disabled
- Ingress disabled

### Staging
- Multiple replicas
- Production-like resource limits
- HPA enabled
- LoadBalancer services

### Production
- High availability (3+ replicas)
- Full resource limits
- HPA autoscaling
- Ingress with TLS
- PDB for zero-downtime deployments
- NetworkPolicy enabled

## Security Features

All charts implement production-ready security:

- **Security Contexts**: Non-root run users, read-only root filesystems
- **NetworkPolicy**: Restrict pod-to-pod communication
- **Network Policies**: DNS egress and database egress controls
- **ServiceAccount**: Dedicated service accounts per workload
- **Secrets Management**: External secrets support with configurable key names
- **Pod Security**: Runtime Default seccomp profiles, dropped capabilities
- **RBAC**: Minimal required permissions

## Monitoring & Observability

Built-in support for Prometheus monitoring:

- **ServiceMonitor**: Automatic service discovery for Prometheus
- **Health Endpoints**: Liveness, readiness, and startup probes
- **Metrics Path**: `/metrics` endpoint for Prometheus scraping

## Backup & Recovery

### PostgreSQL
```yaml
backup:
  enabled: true
  cronjob:
    schedule: "0 2 * * *"
    storage:
      size: 10Gi
```

### MongoDB
```yaml
backup:
  enabled: true
  cronjob:
    schedule: "0 2 * * *"
```

## Database Migrations

Database migrations are handled via Alembic jobs in the backend chart. Ensure secrets are properly configured before running migrations.

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -l app.kubernetes.io/name=backend
kubectl get pods -l app.kubernetes.io/name=frontend
```

### View Logs
```bash
kubectl logs -l app.kubernetes.io/name=backend
kubectl logs -l app.kubernetes.io/name=frontend
```

### Test Connectivity
```bash
kubectl run test --rm -it --image=busybox --restart=Never -- wget -O- http://backend:8000/api/v1/health/ready
```

### Helm Test
```bash
helm test backend
helm test frontend
```

## Upgrading

### Backend
```bash
helm upgrade backend backend/ -f backend/values.yaml --set secrets.create=false
```

### Frontend
```bash
helm upgrade frontend frontend/ -f frontend/values.yaml
```

## Uninstallation

```bash
helm uninstall backend
helm uninstall frontend
helm uninstall postgres --namespace database
helm uninstall mongodb --namespace database
```

## Contributing

1. Make changes to the appropriate chart
2. Update `Chart.yaml` with new version
3. Test locally:
   ```bash
   helm lint ./backend
   helm template ./backend | kubectl apply --dry-run=client -f -
   ```
4. Submit a PR

## License

This project is licensed under the MIT License.

## Contact

- **Maintainer**: Platform Team
- **Email**: platform@example.com

---

<div align="center">
  <sub>Built with ❤️ for Kubernetes deployments</sub>
</div>
