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


# ---------- nginx-config ----------
# Generate the final Nginx configuration at build time.
FROM alpine:3.21 AS nginx-config

RUN apk add --no-cache gettext

ARG BACKEND_URL=http://backend:8000
ARG NGINX_LOCAL_RESOLVERS=10.96.0.10

COPY nginx.conf /tmp/nginx.conf.template

RUN envsubst '${BACKEND_URL} ${NGINX_LOCAL_RESOLVERS}' \
    < /tmp/nginx.conf.template \
    > /tmp/default.conf


# ---------- runtime ----------
FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

# Copy the pre-generated configuration.
# Nginx no longer needs to generate it at container startup.
COPY --from=nginx-config /tmp/default.conf /etc/nginx/conf.d/default.conf

# nginx-unprivileged listens on port 8080.
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/ || exit 1