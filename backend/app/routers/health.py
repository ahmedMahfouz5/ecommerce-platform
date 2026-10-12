from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import check_database_connection

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    """Liveness probe — checks if the application is running."""
    return {"status": "ok"}


@router.get("/api/v1/ready")
async def readiness_check():
    """Readiness probe — checks if the application is ready to serve traffic (DB connected)."""
    db_connected = await check_database_connection()

    if not db_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"},
        )

    return {"status": "ok", "database": "connected"}