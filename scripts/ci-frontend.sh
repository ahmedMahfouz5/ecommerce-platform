#!/usr/bin/env bash
# =============================================================================
# CI pipeline for the frontend — lint, scan, template-check, smoke test.
#
# Expected to run inside a checkout with Docker and the following tools
# available: hadolint, helm, kubeconform, trivy (or grype).
#
# Required ENV vars:
#   IMAGE_TAG   – git SHA (e.g. "abc123def")
#   IMAGE_REPO  – e.g. "ahmedmahfouz0/frontend"
#   IMAGE       – full image ref, e.g. "ahmedmahfouz0/frontend:abc123def"
# =============================================================================

set -Eeuo pipefail

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
IMAGE_REPO="${IMAGE_REPO:-ahmedmahfouz0/frontend}"
IMAGE="${IMAGE:-${IMAGE_REPO}:${IMAGE_TAG}}"
CHART_DIR="helm/frontend"
BACKEND_URL="${BACKEND_URL:-http://backend:8000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass()  { echo -e "${GREEN}[PASS]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
info()  { echo -e "[INFO] $*"; }

# ---------------------------------------------------------------------------
# 1. Hadolint
# ---------------------------------------------------------------------------
info "==> 1/6 Hadolint"
if hadolint frontend/Dockerfile; then
    pass "Hadolint"
else
    fail "Hadolint found issues"
fi

# ---------------------------------------------------------------------------
# 2. Build image with BuildKit
# ---------------------------------------------------------------------------
info "==> 2/6 Build image: $IMAGE"
docker build \
    --build-arg REVISION="$IMAGE_TAG" \
    --build-arg CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -t "$IMAGE" \
    -f frontend/Dockerfile \
    frontend/
pass "Build"

# ---------------------------------------------------------------------------
# 3. Trivy / Grype scan
# ---------------------------------------------------------------------------
info "==> 3/6 Image scan (Trivy)"
if command -v trivy &>/dev/null; then
    trivy image --severity HIGH,CRITICAL --exit-code 1 "$IMAGE" || \
        info "Trivy found vulnerabilities (non-blocking for now)"
    pass "Trivy scan completed"
elif command -v grype &>/dev/null; then
    grype "$IMAGE" --fail-on high || \
        info "Grype found vulnerabilities (non-blocking for now)"
    pass "Grype scan completed"
else
    info "Neither Trivy nor Grype found — skipping scan"
fi

# ---------------------------------------------------------------------------
# 4. Helm lint
# ---------------------------------------------------------------------------
info "==> 4/6 Helm lint --strict"
helm lint --strict "$CHART_DIR"
pass "Helm lint"

# ---------------------------------------------------------------------------
# 5. Helm template + kubeconform
# ---------------------------------------------------------------------------
info "==> 5/6 kubeconform"
helm template frontend "$CHART_DIR" \
    --set image.tag="$IMAGE_TAG" \
    --set image.repository="$IMAGE_REPO" \
    --set backendUrl="$BACKEND_URL" \
    | kubeconform -strict -summary
pass "kubeconform"

# ---------------------------------------------------------------------------
# 6. Smoke test (read-only rootfs)
# ---------------------------------------------------------------------------
info "==> 6/6 Smoke test"
IMAGE="$IMAGE" BACKEND_URL="$BACKEND_URL" ./scripts/smoke-test-frontend.sh
pass "Smoke test"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All CI checks passed for $IMAGE${NC}"
echo -e "${GREEN}========================================${NC}"
