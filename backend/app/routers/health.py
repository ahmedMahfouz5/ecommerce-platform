import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import check_database_connection, check_migration_status
from app.services.s3 import check_s3_connection

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
    """Aggregate readiness — queries all sub-checks for convenience."""
    db_connected = await check_database_connection()
    migrations_ok, current_rev, head_rev = await check_migration_status()
    s3_status = check_s3_connection()

    logger.info(
        "Readiness probe: db_connected=%s, migrations_ok=%s, current_rev=%s, head_rev=%s, s3_connected=%s",
        db_connected,
        migrations_ok,
        current_rev,
        head_rev,
        s3_status["connected"],
    )

    errors = []
    if not db_connected:
        errors.append("database: disconnected")
    if not migrations_ok:
        errors.append(f"migration: incomplete (current={current_rev}, head={head_rev})")
    if not s3_status["connected"]:
        errors.append(f"s3: {s3_status['error']}")

    if errors:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "checks": errors},
        )

    return {
        "status": "ok",
        "database": "connected",
        "migrations": "up_to_date",
        "s3": "connected",
    }


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


@router.get("/api/v1/health/s3")
async def s3_check():
    """Dedicated S3 connectivity probe.

    Verifies the S3 client can reach the configured bucket.
    Logs the result so you can see it in application logs.
    """
    result = check_s3_connection()

    logger.info(
        "S3 probe: connected=%s, bucket=%s, region=%s, error=%s",
        result["connected"],
        result["bucket"],
        result["region"],
        result["error"],
    )

    if not result["connected"]:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "s3": "disconnected",
                "bucket": result["bucket"],
                "region": result["region"],
                "error": result["error"],
            },
        )

    return {
        "status": "ok",
        "s3": "connected",
        "bucket": result["bucket"],
        "region": result["region"],
    }
