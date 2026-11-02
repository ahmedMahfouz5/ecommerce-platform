# E-Commerce Platform Backend

A modular **FastAPI** backend for an e-commerce platform. It provides user authentication with email verification, product catalog management, and presigned S3 image uploads.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
   - [`users`](#users)
   - [`products`](#products)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Routes](#api-routes)
   - [Health](#health)
   - [Authentication](#authentication)
   - [Products](#products)
   - [Product Images](#product-images)
6. [Request / Response Examples](#request--response-examples)
7. [Environment Variables](#environment-variables)
8. [Running the Application](#running-the-application)
9. [Testing](#testing)

---

## Overview

- **Framework:** FastAPI (async)
- **Database:** PostgreSQL with SQLAlchemy 2.0 + Alembic migrations
- **Auth:** JWT access tokens (bearer scheme), bcrypt password hashing
- **File Storage:** AWS S3 presigned URLs for product images
- **Email:** AWS SES (configurable, disabled when sender is empty)
- **Containerized:** Dockerfile included

---

## Project Structure

```
backend/
├── alembic/                  # Alembic migrations
├── app/
│   ├── config.py             # Pydantic settings / env vars
│   ├── main.py               # FastAPI app factory
│   ├── models.py             # Shared SQLAlchemy Base
│   ├── core/database.py      # Async DB engine & helpers
│   ├── routers/health.py     # Health & readiness probes
│   ├── modules/
│   │   ├── auth/             # User auth (models, schemas, service, repo, router)
│   │   └── products/         # Products & product images
│   └── services/             # Email & S3 services
├── tests/                    # pytest suite
├── scripts/                  # Admin/user creation helpers
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## Database Schema

### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `uuid4()` | Unique user ID |
| `username` | `VARCHAR(150)` | NOT NULL, UNIQUE, INDEX | Login username |
| `email` | `VARCHAR(320)` | UNIQUE, INDEX, nullable | User email |
| `hashed_password` | `VARCHAR(128)` | NOT NULL | Bcrypt hash |
| `is_active` | `BOOLEAN` | default `true` | Account active flag |
| `is_admin` | `BOOLEAN` | default `false` | Admin role flag |
| `is_verified` | `BOOLEAN` | default `false` | Email verified flag |
| `verified_at` | `TIMESTAMPTZ` | nullable | Timestamp of verification |
| `verification_token` | `VARCHAR(255)` | nullable | Email verification token |
| `verification_token_expires_at` | `TIMESTAMPTZ` | nullable | Expiry of verification token |
| `reset_token` | `VARCHAR(255)` | nullable | Password reset token |
| `reset_token_expires_at` | `TIMESTAMPTZ` | nullable | Expiry of reset token |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

### `products`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `uuid4()` | Unique product ID |
| `name` | `VARCHAR(255)` | NOT NULL | Product name |
| `description` | `TEXT` | nullable | Product description |
| `price` | `NUMERIC(10,2)` | NOT NULL | Product price |
| `stock_quantity` | `INTEGER` | NOT NULL, default `0` | Available stock |
| `category` | `VARCHAR(100)` | NOT NULL | Product category |
| `image_url` | `VARCHAR(500)` | default NULL | S3 object key for image |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

---

## Authentication & Authorization

The API uses **Bearer JWT tokens**.

- After login, include the header:

  ```http
  Authorization: Bearer <access_token>
  ```

- Tokens are signed with `HS256` and expire in **24 hours**.
- Admin-only routes require a valid token from a user with `is_admin = true`.
- Customers cannot create products, update products, or manage product images.

---

## API Routes

Base URL: `http://localhost:8000`

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | No | Basic health check (no DB) |
| `GET` | `/api/v1/health/live` | No | Liveness probe (K8s) |
| `GET` | `/api/v1/health/ready` | No | Readiness probe |
| `GET` | `/api/v1/health/db_connection` | No | Database connectivity |
| `GET` | `/api/v1/health/db_migration` | No | Alembic migration status |
| `GET` | `/api/v1/health/db_migration/{table}` | No | Check specific table exists (`users` or `products`) |
| `GET` | `/api/v1/health/s3` | No | S3 connectivity |

### Authentication

Prefix: `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | No | Register a new customer |
| `POST` | `/admin/register` | Admin | Register a new admin |
| `POST` | `/verify-email` | No | Verify email with token |
| `POST` | `/resend-verification` | No | Resend verification email |
| `POST` | `/forgot-password` | No | Request password reset email |
| `POST` | `/reset-password` | No | Reset password using token |
| `POST` | `/login` | No | Login and receive JWT |
| `POST` | `/logout` | Customer/Admin | Client-side logout (no-op) |

### Products

Prefix: `/api/v1/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | List products (paginated, filterable) |
| `GET` | `/{product_id}` | No | Get single product |
| `POST` | `/` | Admin | Create product |
| `PUT` | `/{product_id}` | Admin | Update product |
| `DELETE` | `/{product_id}` | Admin | Delete product |

**Query parameters for `GET /api/v1/products/`:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | int | No | `1` | Page number (≥1) |
| `pageSize` | int | No | `20` | Items per page (1-100) |
| `category` | string | No | - | Filter by category |
| `q` | string | No | - | Search name/description (case-insensitive) |

### Product Images

Prefix: `/api/v1/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/{product_id}/image-url` | No | Get presigned GET URL for product image |
| `POST` | `/{product_id}/images/upload-url` | Admin | Get presigned PUT URL to upload an image |
| `PUT` | `/{product_id}/images/confirm` | Admin | Confirm image upload and associate it |

---

## Request / Response Examples

### Register (Customer)

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (`201 Created`)**

```json
{
  "message": "Registration successful. Please check your email for a verification link to activate your account.",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "is_admin": false,
    "is_verified": false,
    "verified_at": null
  }
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Response (`200 OK`)**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 86400,
  "is_admin": false
}
```

### Create Product (Admin)

```http
POST /api/v1/products/
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Wireless Mouse",
  "description": "Ergonomic Bluetooth mouse",
  "price": 29.99,
  "stock_quantity": 100,
  "category": "Electronics"
}
```

**Response (`201 Created`)**

```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "Wireless Mouse",
  "description": "Ergonomic Bluetooth mouse",
  "price": 29.99,
  "stock_quantity": 100,
  "category": "Electronics",
  "image_url": null,
  "image_download_url": null,
  "created_at": "2025-01-01T12:00:00",
  "updated_at": "2025-01-01T12:00:00"
}
```

### List Products

```http
GET /api/v1/products/?page=1&pageSize=20&category=Electronics&q=mouse
```

**Response (`200 OK`)**

```json
{
  "items": [ /* ... products ... */ ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

### Request Image Upload URL (Admin)

```http
POST /api/v1/products/6ba7b810-9dad-11d1-80b4-00c04fd430c8/images/upload-url
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "content_type": "image/jpeg",
  "file_size_bytes": 524288
}
```

**Response (`200 OK`)**

```json
{
  "upload_url": "https://bucket.s3.amazonaws.com/products/...",
  "object_key": "products/6ba7b810-9dad-11d1-80b4-00c04fd430c8/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg",
  "content_type": "image/jpeg",
  "expires_in_seconds": 300
}
```

### Confirm Image Upload (Admin)

```http
PUT /api/v1/products/6ba7b810-9dad-11d1-80b4-00c04fd430c8/images/confirm
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "object_key": "products/6ba7b810-9dad-11d1-80b4-00c04fd430c8/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg"
}
```

---

## Environment Variables

Create a `.env` file in the backend root:

```dotenv
# Database
DATABASE_URL=postgresql+asyncpg://postgres:change-me-in-production@db:5432/ecommerce

# Security
SECRET_KEY=change-me-to-a-random-secret-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Server
BACKEND_PORT=8000

# Frontend (for email links)
FRONTEND_URL=http://localhost:5173

# AWS / S3
AWS_REGION=us-east-2
S3_ASSETS_BUCKET=ecommerce-staging-us-east-2-assets
S3_PRESIGNED_URL_EXPIRATION_SECONDS=300

# AWS / SES (empty disables email sending)
SES_SENDER_EMAIL=noreply@example.com
```

---

## Running the Application

### Local (with virtualenv)

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker

```bash
docker build -t ecommerce-backend .
docker run -p 8000:8000 --env-file .env ecommerce-backend
```

The API docs are available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Testing

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=app --cov-report=html
```
