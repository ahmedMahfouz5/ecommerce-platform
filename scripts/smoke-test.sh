#!/usr/bin/env bash

set -Eeuo pipefail

# Required configuration
IMAGE="${IMAGE:?ERROR: IMAGE is required}"
COMPONENT="${COMPONENT:-app}"
PORT="${PORT:-8000}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/health/live}"
RETRIES="${RETRIES:-30}"
RETRY_DELAY="${RETRY_DELAY:-2}"
CONTAINER_NAME="smoke-${COMPONENT}"

HEALTH_URL="http://localhost:${PORT}${HEALTH_ENDPOINT}"

# Track test result
healthy=false

cleanup() {
    local status=$?

    # Print logs when the script fails
    if [[ "$status" -ne 0 ]]; then
        echo "Smoke test failed. Container logs:"
        docker logs "$CONTAINER_NAME" 2>&1 || true
    fi

    # Always attempt to remove the temporary container
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "========================================"
echo "Smoke test: $COMPONENT"
echo "Image:      $IMAGE"
echo "Health URL: $HEALTH_URL"
echo "========================================"

# Start the temporary container
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${PORT}:${PORT}" \
    "$IMAGE" >/dev/null

echo "Container started. Waiting for application..."

# Retry the health endpoint
for ((i = 1; i <= RETRIES; i++)); do
    if curl -fsS -o /dev/null "$HEALTH_URL"; then
        echo "SUCCESS: $COMPONENT is healthy."
        healthy=true
        break
    fi

    echo "Attempt $i/$RETRIES failed. Retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
done

# Fail the script if the application never becomes healthy
if [[ "$healthy" != true ]]; then
    echo "ERROR: $COMPONENT smoke test failed."
    exit 1
fi

echo "Smoke test passed."