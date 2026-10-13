# Verification Checklist

Run these commands after building the image and deploying the chart.

---

## 1. Image integrity — no baked config

```bash
# Pull and inspect the image. There should be NO backend URL or resolver
# hardcoded in any layer, and the default.conf should be our placeholder.
docker run --rm <image> cat /etc/nginx/conf.d/default.conf
# Expected: "# placeholder – config supplied via /etc/nginx/templates/"

docker run --rm <image> env | grep BACKEND
# Expected: (empty — no BACKEND_URL baked in)

docker history --no-trunc <image> | grep -i backend
# Expected: (empty — no ARG BACKEND_URL layer)
```

## 2. Container starts under read-only rootfs with tmpfs mounts

```bash
IMAGE=<your-image> BACKEND_URL=http://backend:8000 \
  ./scripts/smoke-test-frontend.sh
```

Or manually:

```bash
docker run -d --name test-frontend \
  --read-only \
  --tmpfs /tmp:exec \
  --tmpfs /var/cache/nginx:noexec \
  --tmpfs /var/run:exec \
  --tmpfs /etc/nginx/conf.d:noexec \
  -e BACKEND_URL=http://backend:8000 \
  -p 8080:8080 \
  <image>

# Wait 10 s, then:
curl -s http://localhost:8080/healthz
# Expected: "ok"

# Check no [emerg] lines:
docker logs test-frontend 2>&1 | grep emerg
# Expected: (empty)

docker rm -f test-frontend
```

## 3. Rendered nginx config has correct upstream and resolver

```bash
# On a running container (docker or k8s):
docker exec test-frontend cat /etc/nginx/conf.d/default.conf

# Or on k8s:
kubectl exec -n <ns> deploy/<name> -- cat /etc/nginx/conf.d/default.conf
```

Check:
- `set $backend_url "http://backend:8000";` (or whatever `backendUrl` you set)
- `resolver ...` line with actual DNS IPs
- `proxy_read_timeout 60s;` (or custom)
- `client_max_body_size 1m;` (or custom)
- `server_tokens off;` is present
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are present

## 4. Probes pass

```bash
# Port-forward the service:
kubectl port-forward -n <ns> svc/<name> 8080:8080

# Health check:
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/healthz
# Expected: 200

# SPA fallback (returns index.html, not 404):
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/some-random-page
# Expected: 200

# Asset 404 (correct — no fallback for missing assets):
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/assets/missing.js
# Expected: 404

# Caching headers on index.html:
curl -sI http://localhost:8080/index.html | grep -i cache-control
# Expected: no-cache, no-store, must-revalidate

# Caching headers on assets:
curl -sI http://localhost:8080/assets/somefile.js | grep -i cache-control
# Expected: public, max-age=31536000, immutable
```

## 5. Helm test hook

```bash
helm test <release-name> -n <namespace>
# Expected: "PASSED"
```

## 6. Config change rolls pods

```bash
# Change backendUrl and check that pods restart:
helm upgrade --install <release> ./helm/frontend \
  --set backendUrl=http://new-backend:8000 --set image.tag=<sha>

kubectl rollout status -n <ns> deploy/<name>
# Should show new pods being created
```

## 7. PodDisruptionBudget (prod only)

```bash
kubectl get pdb -n <ns>
# Expected: frontend-prod  minAvailable 1
```

## 8. NetworkPolicy (prod only)

```bash
kubectl get networkpolicy -n <ns>
# Expected: frontend-prod with ingress + egress rules
```
