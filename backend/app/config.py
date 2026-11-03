from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # PostgreSQL Database (users)
    database_url: str = (
        "postgresql+asyncpg://postgres:change-me-in-production@db:5432/ecommerce"
    )

    # MongoDB Database (products)
    mongodb_url: str = "mongodb://mongo:27017/ecommerce"

    # Security
    secret_key: str = "change-me-to-a-random-secret-key"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Server
    backend_port: int = 8000

    # Frontend (used for email links)
    frontend_url: str = "http://localhost:5173"

    # AWS / S3
    aws_region: str = "us-east-2"
    s3_assets_bucket: str = "ecommerce-staging-us-east-2-assets"
    s3_presigned_url_expiration_seconds: int = 300  # 5 minutes
    cdn_assets_domain: str = "cdn.ahmedmahfouz.click"  # CloudFront CDN custom domain

    # AWS / SES
    ses_sender_email: str = (
        ""  # e.g. "noreply@example.com" – empty means SES is disabled
    )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
