# ============================================================
# Stage 1: build — compile TypeScript, bundle with Vite
# ============================================================
FROM node:22.14-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Stage 2: dev — Vite dev server with HMR (for compose)
# ============================================================
FROM node:22.14-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ============================================================
# Stage 3: runtime — production nginx serving dist/
#           (LAST stage = default target of docker build)
# ============================================================
FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# nginx-unprivileged listens on 8080 (default in its base config)
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/
