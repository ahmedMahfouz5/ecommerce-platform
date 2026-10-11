from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import check_database_connection

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    """Health check endpoint that verifies database connectivity.

    Returns 200 if the application and database are healthy.
    Returns 503 if the database is unreachable.
    """
    db_connected = await check_database_connection()

    if not db_connected:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected"},
        )

    return {"status": "ok", "database": "connected"}