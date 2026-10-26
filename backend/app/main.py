import json
from decimal import Decimal
from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.modules.products.image_router import router as product_images_router
from app.modules.products.router import router as products_router
from app.routers import health

# add comment to trigger CI workflow detection 2026-10-15 10:41:52
# 2026-10-18 14:30:25


class _CustomEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal and UUID."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


class _CustomJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            cls=_CustomEncoder,
        ).encode("utf-8")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="E-Commerce Platform",
        description="A modular e-commerce platform API",
        version="0.1.0",
        default_response_class=_CustomJSONResponse,
    )

    # CORS middleware
    origins = [origin.strip() for origin in settings.cors_origins.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router)
    app.include_router(products_router)
    app.include_router(product_images_router)

    return app


app = create_app()
