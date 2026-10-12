from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import check_database_connection

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    """Existing health check — kept for backward compatibility. No DB check."""
    return {"status": "ok"}


@router.get("/api/v1/health/live")
async def liveness_check():
    """Kubernetes liveness probe — checks only that the process is alive (no DB)."""
    return {"status": "ok"}


@router.get("/api/v1/health/ready")
async def readiness_check():
    """Kubernetes readiness probe — checks database connectivity."""
    db_connected = await check_database_connection()

    if not db_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"},
        )

    return {"status": "ok", "database": "connected"}
