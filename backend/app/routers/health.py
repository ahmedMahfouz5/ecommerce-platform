import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import check_database_connection, check_migration_status, engine
from app.services.s3 import check_s3_connection
from sqlalchemy import text

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
    """Readiness probe — checks only that the app can handle requests."""
    return {"status": "ok"}


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


# ── per-table migration checks ───────────────────────────────────────────

# Whitelist of valid table names derived from SQLAlchemy models
_VALID_TABLES = {"users", "products"}


async def _table_exists(table_name: str) -> bool:
    """Check whether a table exists in the database."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    "SELECT EXISTS ("
                    "  SELECT FROM information_schema.tables"
                    "  WHERE table_name = :table"
                    ")"
                ),
                {"table": table_name},
            )
            return bool(result.scalar())
    except Exception:
        return False


@router.get("/api/v1/health/db_migration/{table}")
async def table_migration_check(table: str):
    """Check whether a specific table exists in the database.

    Only whitelisted tables are accepted to prevent information leakage.
    """
    if table not in _VALID_TABLES:
        return JSONResponse(
            status_code=404,
            content={
                "status": "error",
                "table": table,
                "message": f"Unknown table. Valid tables: {', '.join(sorted(_VALID_TABLES))}",
            },
        )

    exists = await _table_exists(table)

    logger.info("Table probe: table=%s, exists=%s", table, exists)

    if not exists:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "table": table,
                "message": f"Table '{table}' does not exist in the database",
            },
        )

    return {
        "status": "ok",
        "table": table,
        "message": f"Table '{table}' exists",
    }
