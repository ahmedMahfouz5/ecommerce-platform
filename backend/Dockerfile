# syntax=docker/dockerfile:1

# ---------- build: dependencies into a venv ----------
FROM python:3.12-slim-bookworm AS build
WORKDIR /app
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Only needed if a dependency compiles from source:
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
#     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv
RUN --mount=type=cache,target=/root/.cache/pip \
    /opt/venv/bin/pip install -r requirements.txt


# ---------- dev: compose + bind mount, hot reload ----------
FROM build AS dev
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements-dev.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements-dev.txt

RUN groupadd -r appgroup && useradd -r -M -g appgroup -u 1000 appuser
USER appuser

EXPOSE 8000
# Source code comes from the compose bind mount (./:/app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# ---------- runtime: production (default target) ----------
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app

RUN groupadd -r appgroup && useradd -r -M -g appgroup -u 1000 appuser

COPY --from=build /opt/venv /opt/venv
COPY app ./app            # adjust: add alembic/, etc. if needed

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=3)" || exit 1

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]