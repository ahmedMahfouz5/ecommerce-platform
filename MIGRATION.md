# Migration Guide – Frontend Dockerfile & Helm Chart Refactor

## What changed

### 1. Image is now environment-agnostic

**Before:** The Dockerfile had a `nginx-config` stage that baked `BACKEND_URL` and
`NGINX_LOCAL_RESOLVERS` into `/etc/nginx/conf.d/default.conf` at build time.
Every environment (dev / staging / prod) needed a separate image build.

**After:** The runtime image contains **only** the compiled static assets in
`/usr/share/nginx/html`. The stock `default.conf` is neutralized. All
configuration is injected at deploy time via a Helm ConfigMap that provides
`/etc/nginx/templates/default.conf.template`. The nginx-unprivileged entrypoint
renders it with `envsubst` on container startup using the environment variables
`BACKEND_URL`, `PROXY_READ_TIMEOUT`, `CLIENT_MAX_BODY_SIZE`, and optionally
`NGINX_LOCAL_RESOLVERS`.

### 2. DNS resolver auto-detection

The resolver is **no longer hardcoded**. The nginx-unprivileged image ships
`/docker-entrypoint.d/15-local-resolvers.envsh` which reads the pod's
`/etc/resolv.conf` and exports `NGINX_LOCAL_RESOLVERS`. You can override it
via `helm --set nginx.localResolvers=...` in rare cases.

### 3. Helm chart restructured

| Old key | New key |
|---|---|
| `replicas` | `replicaCount` |
| `backend.host` + `backend.port` | `backendUrl` (full URL string) |
| (none) | `nginx.*` tunables |
| (none) | `probes.*` (configurable paths, delays) |
| (none) | `serviceAccount`, `pdb`, `hpa`, `ingress`, `networkPolicy` |
| `fullnameOverride: frontend` (hardcoded) | `""` (empty by default, multi-release safe) |
| `image.tag` with hardcoded default | `""` (required at install time) |

New templates: `configmap.yaml`, `serviceaccount.yaml`, `pdb.yaml`, `hpa.yaml`,
`ingress.yaml`, `networkpolicy.yaml`, `tests/test-healthz.yaml`.

### 4. Production-ready defaults

- `values-prod.yaml`: 2+ replicas, higher resources, PDB, HPA, topology spread,
  NetworkPolicy, TLS Ingress.
- `values-dev.yaml`: single replica, lower resources, dev ingress.
- `values.schema.json`: validates required fields and types.

## How to deploy

```bash
# Development
helm upgrade --install frontend-dev ./helm/frontend \
  -f helm/frontend/values-dev.yaml \
  --set image.tag=<git-sha> \
  --set image.repository=<your-repo>

# Production
helm upgrade --install frontend-prod ./helm/frontend \
  -f helm/frontend/values-prod.yaml \
  --set image.tag=<git-sha> \
  --set image.repository=<your-repo>
```

## How to change the backend URL (no rebuild needed)

```bash
helm upgrade --install frontend-prod ./helm/frontend \
  -f helm/frontend/values-prod.yaml \
  --set image.tag=<current-sha> \
  --set image.repository=<your-repo> \
  --set backendUrl=http://new-backend:8000
```

The `checksum/env` annotation ensures pods are rolled out on any backendUrl change.

## Rollback

```bash
helm rollback frontend-prod
```

## Breaking changes

- `image.tag` is now **required** at install time (no default). CI must pass it.
- `backend.host`/`backend.port` replaced by `backendUrl`. Update any wrapper scripts.
- If you previously relied on `fullnameOverride: frontend`, remove it or set it
  explicitly. The default now uses `release-chartName`.

## Local docker-compose

Both `docker-compose.yml` and `docker-compose.prod.yml` now mount
`./frontend/nginx.conf` into `/etc/nginx/templates/default.conf.template:ro`
and pass the `PROXY_READ_TIMEOUT` and `CLIENT_MAX_BODY_SIZE` env vars.
No other changes needed.
