# GitOps Configuration for E-commerce Platform

This repository contains GitOps configurations for deploying and managing the entire e-commerce platform Kubernetes stack using ArgoCD.

## Overview

This GitOps setup manages the following components using an ArgoCD "App of Apps" pattern through a single templated Application manifest:

### Observability & Security
| Component | Purpose | Namespace | Sync Wave |
|-----------|---------|-----------|-----------|
| **Monitoring** (Kube-Prometheus-Stack) | Metrics, logs, and alerting with Grafana & Prometheus | `monitoring` | - |
| **SonarQube PostgreSQL** | Database for SonarQube | `sonarqube` | **0** |
| **SonarQube** | Static code analysis and code quality | `sonarqube` | **1** |
| **Trivy Operator** | Container security scanning and vulnerability management | `trivy-system` | - |

### Application Stack
| Component | Purpose | Namespace | Sync Wave |
|-----------|---------|-----------|-----------|
| **PostgreSQL** | Primary application database | `prod` | **0** |
| **MongoDB** | NoSQL database for application | `prod` | **0** |
| **Backend Migration** | Database migration jobs | `prod` | **1** |
| **Backend (prod)** | Main backend API service | `prod` | **2** |
| **Frontend (prod)** | Web frontend application | `prod` | **3** |

## Repository Structure

```
gitops/
├── apps.yaml.tftpl                # ArgoCD Applications template (Helm charts + local values)
├── README.md                      # This file
├── monitoring/
│   └── values.yaml                # Kube-Prometheus-Stack Helm values
├── sonarqube/
│   ├── values.yaml                # SonarQube application Helm values
│   └── values.db.yaml             # Sonarqube PostgreSQL database Helm values
└── trivy-operator/
    └── values.yaml                # Trivy Operator Helm values
```

---

## Deployment Architecture

### ArgoCD Application Template

The file `apps.yaml.tftpl` is a Terraform template that generates ArgoCD Applications. Each application is configured using the **multi-source** pattern:
- **Source 1:** External Helm chart repository
- **Source 2:** Local value files from this Git repository (via `ref: values`)

### Sync Waves (Deployment Order)

Applications are deployed in order using ArgoCD sync waves to ensure proper dependency management:

```
Wave 0:  Infrastructure (PostgreSQL, MongoDB, SonarQube DB)
Wave 1:  Migrations & Dependencies (Backend Migration, SonarQube App)
Wave 2:  Backend Services (Backend API)
Wave 3:  Frontend Services (Frontend Web)
```

---

## Components

### 1. Monitoring Stack (Kube-Prometheus-Stack)

**Chart:** `kube-prometheus-stack`  
**Version:** `92.14.1`  
**Source:** `https://prometheus-community.github.io/helm-charts`  
**Values:** `monitoring/values.yaml`

This configuration deploys a complete monitoring stack including:
- **Prometheus** - Time-series database for metrics collection
- **Grafana** - Visualization and dashboards
- **Alertmanager** - Alert routing and management
- **Prometheus Operator** - Kubernetes native monitoring

#### Key Configurations:
- **Grafana:**
  - Host: `grafana.ahmedmahfouz.click`
  - Ingress: Kong with HTTPS redirect
  - Credentials: `admin` / `admin`
  - Automatic dashboard discovery via ConfigMap labels
  - Persistence: 10Gi

- **Prometheus:**
  - Retention: 15 days / 20GB
  - Storage: 2Gi (GP3)
  - Resources: 300m-1 CPU, 1Gi-3Gi memory
  - ServiceMonitor and PodMonitor discovery enabled across all namespaces

---

### 2. SonarQube (Code Quality)

#### 2.1 SonarQube PostgreSQL Database

**Chart:** Custom Helm chart  
**Path:** `helm/postgresql`  
**Values:** `sonarqube/values.db.yaml`  
**Namespace:** `sonarqube`  
**Sync Wave:** `0`

External PostgreSQL database for SonarQube:
- **Service:** `sonarqube-postgres.sonarqube.svc.cluster.local:5432`
- **Database:** `sonarqube`
- **Storage:** 1Gi
- **Resources:** 250m-500m CPU, 256Mi-512Mi memory

#### 2.2 SonarQube Application

**Chart:** `sonarqube`  
**Version:** `10.8.0`  
**Source:** `https://SonarSource.github.io/helm-chart-sonarqube`  
**Values:** `sonarqube/values.yaml`  
**Namespace:** `sonarqube`  
**Sync Wave:** `1`

Complete SonarQube deployment connecting to external database:
- **Host:** `sonarqube.ahmedmahfouz.click`
- **Edition:** Community (10.7.0)
- **Persistence:** 10Gi (GP3)
- **Resources:** 1-2 CPU, 3Gi-4Gi memory
- **Prometheus Exporter:** Enabled
- **Retry Policy:** 5 attempts with exponential backoff (10s -> 3m)

---

### 3. Trivy Operator (Security Scanning)

**Chart:** `trivy-operator`  
**Version:** `0.32.1`  
**Source:** `https://aquasecurity.github.io/helm-charts`  
**Values:** `trivy-operator/values.yaml`  
**Namespace:** `trivy-system`

Aqua Security Trivy Operator for continuous security scanning:

#### Features Enabled:
- **Vulnerability Scanning** - Container image CVE detection
- **SBOM Generation** - Software Bill of Materials
- **Config Audit** - Kubernetes configuration security checks
- **RBAC Assessment** - Role-based access control analysis
- **Exposed Secret Scanning** - Credential and secret detection

#### Target Namespaces:
- `prod` - Production application workloads
- `monitoring` - Monitoring stack
- `kong` - API Gateway

#### Excluded Namespaces:
- `kube-system`, `kube-public`, `kube-node-lease`, `trivy-system`

#### Key Configurations:
- **ServiceMonitor:** Enabled for Prometheus integration
- **Scrape Interval:** 30 seconds
- **Scan Job Timeout:** 10 minutes
- **Job TTL:** 1 hour (auto-cleanup)

---

### 4. Application Databases

#### 4.1 PostgreSQL (Application)

**Chart:** Custom Helm chart  
**Path:** `helm/postgresql`  
**Values:** `values-local.yaml`  
**Namespace:** `prod`  
**Sync Wave:** `0`

Primary relational database for the e-commerce backend.

#### 4.2 MongoDB

**Chart:** Custom Helm chart  
**Path:** `helm/mongodb`  
**Values:** `values-local.yaml`  
**Namespace:** `prod`  
**Sync Wave:** `0`

NoSQL database for document storage and caching needs.

---

### 5. Backend Migration

**Path:** `migration/`  
**Namespace:** `prod`  
**Sync Wave:** `1`

Database migration jobs run before backend deployment:
- Executes database schema updates
- Runs as Kubernetes Job
- Must complete before backend starts

---

### 6. Backend Application (Production)

**Chart:** `helm/backend`  
**Values:** `values-prod.yaml`  
**Namespace:** `prod`  
**Sync Wave:** `2`

Main API backend service:
- Depends on: PostgreSQL, MongoDB, Migration completion
- Exposed via Kong Ingress

---

### 7. Frontend Application (Production)

**Chart:** `helm/frontend`  
**Values:** `values-prod.yaml`  
**Namespace:** `prod`  
**Sync Wave:** `3`

Web frontend application:
- Depends on: Backend API availability
- Static assets served via CDN/ingress

---

## Prerequisites

- Kubernetes cluster (EKS or similar)
- **ArgoCD** installed and configured
- **Kong Ingress Controller** configured
- **Helm** 3.x
- **StorageClass** `gp3` available
- External DNS configured for domain `ahmedmahfouz.click`

---

## Usage

### Deploying with ArgoCD

The `apps.yaml.tftpl` is rendered by Terraform and applied to your cluster. This creates an "App of Apps" that manages all components.

```bash
# Template variables are populated by Terraform:
# ${repo_url}      - Git repository URL
# ${target_revision} - Git branch/tag (e.g., main)

# Apply the generated template
kubectl apply -f apps.yaml
```

### Manual Helm Deployment (Development)

If you need to deploy components manually:

#### Monitoring Stack
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --version 92.14.1 \
  --values monitoring/values.yaml
```

#### SonarQube
```bash
# 1. Database first
helm upgrade --install sonarqube-postgres ./helm/postgresql \
  --namespace sonarqube --create-namespace \
  --values sonarqube/values.db.yaml

# 2. Application
helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube
helm upgrade --install sonarqube sonarqube/sonarqube \
  --namespace sonarqube \
  --version 10.8.0 \
  --values sonarqube/values.yaml
```

#### Trivy Operator
```bash
helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm upgrade --install trivy-operator aqua/trivy-operator \
  --namespace trivy-system --create-namespace \
  --version 0.32.1 \
  --values trivy-operator/values.yaml
```

---

## Sync Policy Configuration

### Automated Sync (Enabled for most apps)
```yaml
automated:
  prune: true      # Remove resources not in Git
  selfHeal: true   # Correct drift from desired state
```

### Special Configurations
- **SonarQube:** `prune: false` (preserve data on sync issues)
- **Monitoring:** `ServerSideApply: true` (for large CRDs)
- **Trivy Operator:** `ServerSideApply: true`

---

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | https://grafana.ahmedmahfouz.click | admin / admin |
| **SonarQube** | https://sonarqube.ahmedmahfouz.click | Default: admin / admin |
| **Backend API** | Via Kong Gateway (prod namespace) | API keys required |
| **Frontend** | Via Kong Gateway | - |
| **ArgoCD** | Configured separately | SSO/OAuth |

### Port Forwarding (for local access)
```bash
# Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Prometheus
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090

# SonarQube
kubectl port-forward -n sonarqube svc/sonarqube-sonarqube 9000:9000

# Application PostgreSQL (for debugging)
kubectl port-forward -n prod svc/postgres-postgresql 5432:5432
```

---

## Security Notes

**Important:**
- Default credentials are provided for initial setup only
- Change default passwords immediately after deployment
- Consider using **External Secrets Operator** or **Vault** for production credentials
- TLS/SSL certificates should be configured via cert-manager
- Trivy Operator continuously scans for vulnerabilities - review reports regularly

---

## Maintenance

### Updating Chart Versions
Edit `apps.yaml.tftpl` and update the `targetRevision` fields:

```bash
# Check latest versions
helm search repo prometheus-community/kube-prometheus-stack
helm search repo sonarqube/sonarqube
helm search repo aqua/trivy-operator
```

### Update Plugins
```bash
# Update Helm repositories
helm repo update
```

### Backup Considerations
- **Application Data:** PostgreSQL and MongoDB persistent volumes
- **Monitoring Data:** Prometheus TSDB snapshots
- **SonarQube:** PostgreSQL database backups
- **Grafana Dashboards:** Export to JSON before major updates

---

## Troubleshooting

### ArgoCD Application Issues

**Check application status:**
```bash
argocd app list
argocd app get monitoring
```

**Force sync:**
```bash
argocd app sync monitoring --force
```

### Component-Specific Issues

**Grafana dashboards not loading:**
```bash
# Check ConfigMap labels
kubectl get configmaps --all-namespaces -l grafana_dashboard=1
```

**SonarQube won't start:**
```bash
# Check database connectivity
kubectl logs -n sonarqube deployment/sonarqube-sonarqube

# Verify PostgreSQL is ready
kubectl get pods -n sonarqube -l app=sonarqube-postgres
```

**Trivy scans not running:**
```bash
# Check operator logs
kubectl logs -n trivy-system deployment/trivy-operator

# Check for scan jobs stuck/failed
kubectl get jobs -n trivy-system
```

**Backend won't deploy (Wave 2):**
```bash
# Check migration job completed
kubectl get jobs -n prod
kubectl logs -n prod job/backend-migration
```

---

## Contributing

When modifying this GitOps configuration:

1. **Test changes** in a non-production environment first
2. **Update sync waves** if adding dependencies between components
3. **Document** significant configuration changes in this README
4. **Ensure backward compatibility** - do not break existing deployments
5. **Update chart versions** - keep dependencies current

---

## License

This configuration is maintained as part of the e-commerce platform project.
