import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import check_database_connection, check_migration_status

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    """Existing health check — kept for backward compatibility. No DB check."""
    return {"status": "ok"}


@router.get("/api/v1/health/live")
async def liveness_check():
    """Kubernetes liveness probe — checks only that the process is alive (no DB)."""
    return {"status": "ok"}


# ── dedicated routes ──────────────────────────────────────────────────────


@router.get("/api/v1/health/ready")
async def readiness_check():
    """Aggregate readiness — queries both sub-checks for convenience."""
    # Check DB
    db_connected = await check_database_connection()
    # Check migrations
    migrations_ok, current_rev, head_rev = await check_migration_status()

    logger.info(
        "Readiness probe: db_connected=%s, migrations_ok=%s, current_rev=%s, head_rev=%s",
        db_connected,
        migrations_ok,
        current_rev,
        head_rev,
    )

    errors = []
    if not db_connected:
        errors.append("database: disconnected")
    if not migrations_ok:
        errors.append(f"migration: incomplete (current={current_rev}, head={head_rev})")

    if errors:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "checks": errors},
        )

    return {"status": "ok", "database": "connected", "migrations": "up_to_date"}


@router.get("/api/v1/health/db_connection")
async def db_connection_check():
    """Dedicated database-connectivity probe."""
    db_connected = await check_database_connection()

    logger.info("DB connection probe: connected=%s", db_connected)

    if not db_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"},
        )

    return {"status": "ok", "database": "connected"}


@router.get("/api/v1/health/db_migration")
async def db_migration_check():
    """Dedicated migration-status probe."""
    migrations_ok, current_rev, head_rev = await check_migration_status()

    logger.info(
        "Migration probe: ok=%s, current=%s, head=%s",
        migrations_ok,
        current_rev,
        head_rev,
    )

    if not migrations_ok:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "migration": "incomplete",
                "current_revision": current_rev,
                "head_revision": head_rev,
            },
        )

    return {"status": "ok", "migration": "up_to_date"}
