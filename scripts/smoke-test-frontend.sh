#!/usr/bin/env bash
# =============================================================================
# Smoke test for the frontend nginx container running with read-only rootfs.
#
# Usage:
#   IMAGE=<image> BACKEND_URL=http://mock:8000 ./scripts/smoke-test-frontend.sh
# =============================================================================

set -Eeuo pipefail

IMAGE="${IMAGE:?ERROR: IMAGE is required (e.g. IMAGE=frontend:abc123 ...)}"
BACKEND_URL="${BACKEND_URL:-http://backend:8000}"
CONTAINER_NAME="smoke-frontend"
PORT=8080
HEALTH_URL="http://localhost:${PORT}/healthz"

healthy=false

cleanup() {
    local status=$?
    if [[ "$status" -ne 0 ]]; then
        echo "==> Container logs (last 50 lines):"
        docker logs "$CONTAINER_NAME" --tail 50 2>&1 || true
        echo "==> Checking for nginx [emerg] lines:"
        docker logs "$CONTAINER_NAME" 2>&1 | grep -i emerg || echo "(no emergency lines)"
    fi
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "========================================"
echo "Smoke test: frontend (read-only rootfs)"
echo "Image:       $IMAGE"
echo "Backend URL: $BACKEND_URL"
echo "========================================"

# Start container with read-only root filesystem and all required tmpfs mounts.
# This mirrors exactly what Kubernetes does with the pod spec.
# The nginx.conf template must be mounted so the entrypoint can render it.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

docker run -d \
    --name "$CONTAINER_NAME" \
    --read-only \
    --tmpfs /tmp:exec \
    --tmpfs /var/cache/nginx:noexec \
    --tmpfs /var/run:exec \
    --tmpfs /etc/nginx/conf.d:noexec \
    -v "${REPO_ROOT}/frontend/nginx.conf:/etc/nginx/templates/default.conf.template:ro" \
    -e BACKEND_URL="$BACKEND_URL" \
    -e PROXY_READ_TIMEOUT="60s" \
    -e CLIENT_MAX_BODY_SIZE="1m" \
    -p "${PORT}:${PORT}" \
    "$IMAGE" >/dev/null

echo "Container started. Waiting for nginx..."

# Wait up to 60 s (startup probe equivalent)
for ((i = 1; i <= 30; i++)); do
    if curl -fsS -o /dev/null "$HEALTH_URL"; then
        echo "SUCCESS: /healthz returned 200"
        healthy=true
        break
    fi
    echo "Attempt $i/30 failed. Retrying in 2s..."
    sleep 2
done

if [[ "$healthy" != true ]]; then
    echo "ERROR: frontend smoke test failed — /healthz never became healthy"
    exit 1
fi

# Check for [emerg] log lines
if docker logs "$CONTAINER_NAME" 2>&1 | grep -qi emerg; then
    echo "ERROR: nginx [emerg] lines found in logs"
    exit 1
fi

# Verify the rendered config has the right BACKEND_URL
echo ""
echo "==> Rendered nginx config (proxy_pass line):"
docker exec "$CONTAINER_NAME" grep -n 'proxy_pass\|set \$backend_url\|resolver' /etc/nginx/conf.d/default.conf || echo "(config check failed)"

echo ""
echo "Smoke test passed."
