FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for building asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application with hot-reload for development
# =============================================================================
# Stage 1: build — compile dependencies into a virtualenv
# =============================================================================
FROM python:3.12-slim-bookworm AS build

WORKDIR /app

COPY requirements.txt .

RUN python -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt


# =============================================================================
# Stage 2: dev — extends build for compose-based development
# =============================================================================
FROM python:3.12-slim-bookworm AS dev

WORKDIR /app

COPY --from=build /opt/venv /opt/venv
COPY requirements-dev.txt .

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir -r requirements-dev.txt

RUN groupadd -r appgroup && \
    useradd -r -g appgroup -u 1000 appuser

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# =============================================================================
# Stage 3: runtime — production image (the default target)
# =============================================================================
FROM python:3.12-slim-bookworm AS runtime

WORKDIR /app

RUN groupadd -r appgroup && \
    useradd -r -g appgroup -u 1000 appuser

COPY --from=build /opt/venv /opt/venv
COPY . .

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health', timeout=3)" || exit 1

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
