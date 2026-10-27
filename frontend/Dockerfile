# =============================================================================
# Frontend – multi-stage Dockerfile
#
# Stages:
#   deps    – install npm dependencies (BuildKit cache mount)
#   build   – compile TypeScript + Vite bundle
#   dev     – compose development server (HMR, port 5173)
#   runtime – nginx serving /app/dist, zero env baked in
#
# The runtime image contains ONLY the static assets.  All Nginx configuration
# is supplied at deploy time via a ConfigMap template mounted at
# /etc/nginx/templates/default.conf.template.  The nginx-unprivileged
# entrypoint renders it into /etc/nginx/conf.d/default.conf on startup.
# =============================================================================

# ========== deps ==========
FROM node:22.14-alpine@sha256:01393fe5a51489b63da0ab51aa8e0a7ff9990132917cf20cfc3d46f5e36c0e48 AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci
# ========== build ==========
FROM deps AS build

# Build-time variables consumed by Vite (VITE_* are statically replaced).
# Supply via --build-arg, e.g.:
#   docker build --build-arg VITE_IMAGE_BASE_URL=https://cdn.example.com/ ...
ARG VITE_API_TARGET="http://backend:8000"
ARG VITE_IMAGE_BASE_URL=""

# Expose ARGs as ENVs so Vite picks them up during `npm run build`.
ENV VITE_API_TARGET=${VITE_API_TARGET}
ENV VITE_IMAGE_BASE_URL=${VITE_IMAGE_BASE_URL}

COPY . .

RUN npm run build


# ========== dev (docker-compose HMR) ==========
FROM deps AS dev

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ========== runtime ==========
FROM nginxinc/nginx-unprivileged:1.27.4-alpine@sha256:2211200bb46431bb70f044f83cd989901205ce3232e1c431822876f1fd166689 AS runtime

# --- labels (metadata only – never env-specific) ---
ARG SOURCE="https://github.com/org/ecommerce-platform"
ARG REVISION="unknown"
ARG VERSION="0.1.0"
ARG CREATED="unknown"

LABEL org.opencontainers.image.source=${SOURCE} \
      org.opencontainers.image.revision=${REVISION} \
      org.opencontainers.image.version=${VERSION} \
      org.opencontainers.image.created=${CREATED} \
      org.opencontainers.image.title="ecommerce-frontend" \
      org.opencontainers.image.description="E-commerce React SPA frontend"

# Copy built assets only.
COPY --from=build /app/dist /usr/share/nginx/html

# Remove the stock default.conf so only the templated config is served.
# We can't delete it (read-only layer) but we can empty it so it is harmless
# even if the ConfigMap mount fails.
RUN echo '# placeholder – config supplied via /etc/nginx/templates/' \
    > /etc/nginx/conf.d/default.conf

# The nginx-unprivileged image already listens on port 8080 as non-root (UID 101).
EXPOSE 8080

# HEALTHCHECK is only useful for docker-compose; Kubernetes ignores it.
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

