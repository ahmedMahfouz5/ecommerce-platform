# ---------- deps (shared, cached) ----------
FROM node:22.14-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- build ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- dev (compose, HMR) ----------
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- runtime ----------
FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

# Goes in templates/ so the entrypoint runs envsubst on it at startup
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Auto-detect the DNS resolver (Docker, k8s, etc.) -> $NGINX_LOCAL_RESOLVERS
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    BACKEND_URL=http://backend:8000

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1