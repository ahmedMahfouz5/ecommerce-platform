# E-Commerce Platform Backend

A modular **FastAPI** backend for an e-commerce platform. It provides user authentication with email verification, product catalog management, presigned S3 image uploads, and admin user management.

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
   - [Admin Users](#admin-users)
   - [Products](#products)
   - [Product Images](#product-images)
6. [Management Scripts](#management-scripts)
7. [Request / Response Examples](#request--response-examples)
8. [Environment Variables](#environment-variables)
9. [Running the Application](#running-the-application)
10. [Testing](#testing)

---

## Overview

- **Framework:** FastAPI (async)
- **Database:** PostgreSQL with SQLAlchemy 2.0 + Alembic migrations
- **Auth:** JWT access tokens (bearer scheme), bcrypt password hashing
- **File Storage:** AWS S3 presigned URLs for product images
- **Email:** AWS SES (required; registration fails if SES is not configured or the send fails)
- **Containerized:** Dockerfile included

---

## Project Structure

```text
backend/
├── alembic/                # Database migrations
├── app/
│   ├── config.py           # Pydantic settings
│   ├── core/
│   │   └── database.py       # SQLAlchemy engine & session
│   ├── modules/
│   │   ├── auth/             # Authentication module
│   │   │   ├── admin_router.py   # Admin user management routes
│   │   │   ├── router.py         # Public auth routes
│   │   │   ├── service.py        # Auth business logic
│   │   │   ├── repository.py     # User data access
│   │   │   ├── models.py         # User SQLAlchemy model
│   │   │   ├── schemas.py        # Pydantic request/response models
│   │   │   └── dependencies.py # JWT & admin guards
│   │   └── products/         # Product & image modules
│   ├── routers/              # Extra routers (health)
│   └── services/             # Email service (SES)
├── scripts/                 # CLI management scripts
├── tests/                   # Pytest test suite
├── Dockerfile
└── requirements.txt
```

---

## Database Schema

### `users`

| Column                        | Type      | Notes                                      |
|-------------------------------|-----------|--------------------------------------------|
| `id`                          | UUID      | Primary key                                |
| `username`                    | String    | Unique, required                           |
| `email`                       | String    | Unique, nullable                           |
| `hashed_password`             | String    | bcrypt hash                                |
| `is_active`                   | Boolean   | Can log in?                                |
| `is_admin`                    | Boolean   | Admin privileges                           |
| `is_verified`                 | Boolean   | Email verified? Required for login         |
| `verified_at`                 | DateTime  | When the email was verified                |
| `verification_token`          | String    | URL-safe token sent by email               |
| `verification_token_expires_at`| DateTime | Expiry for verification token             |
| `reset_token`                 | String    | Password reset token                       |
| `reset_token_expires_at`      | DateTime  | Expiry for reset token                     |
| `created_at` / `updated_at`   | DateTime  | Auto-managed timestamps                    |

### `products`

See the products module for full schema details. Includes product details, price, stock, and related image records.

---

## Authentication & Authorization

- Passwords are hashed with **bcrypt**.
- A successful `POST /api/v1/auth/login` returns a **JWT** access token.
- Include the token in the `Authorization: Bearer <token>` header for protected routes.
- Only verified users (`is_verified = true`) can log in.
- Admin-only routes check the JWT and require `is_admin = true`.

---

## API Routes

Base path: `/api/v1`

### Health

| Method | Path     | Description                  |
|--------|----------|------------------------------|
| `GET`  | `/health`| Health & migration status    |

### Authentication

All under `/api/v1/auth`.

| Method | Path                  | Auth   | Description                              |
|--------|-----------------------|--------|------------------------------------------|
| `POST` | `/register`           | None   | Register a customer (sends verification email) |
| `POST` | `/admin/register`     | Admin  | Register another admin account           |
| `POST` | `/login`              | None   | Log in and receive JWT                   |
| `POST` | `/logout`             | Bearer | No-op logout (client discards token)     |
| `POST` | `/verify-email`       | None   | Verify email using token from inbox      |
| `POST` | `/resend-verification`| None   | Resend verification email                |
| `POST` | `/forgot-password`    | None   | Send password reset email                |
| `POST` | `/reset-password`     | None   | Reset password using reset token         |

### Admin Users

All under `/api/v1/admin/users`. Requires admin JWT.

| Method   | Path           | Description                          |
|----------|----------------|--------------------------------------|
| `GET`    | `/`            | List all users                       |
| `PATCH`  | `/{user_id}`   | Update a user (role, status, verified) |
| `DELETE` | `/{user_id}`   | Delete a user                        |

Example request body for `PATCH /api/v1/admin/users/{user_id}`:

```json
{
  "is_admin": true,
  "is_active": true,
  "is_verified": true
}
```

### Products

Under `/api/v1/products`.

| Method   | Path           | Auth   | Description              |
|----------|----------------|--------|--------------------------|
| `GET`    | `/`            | None   | List all products        |
| `GET`    | `/{product_id}`| None   | Get a single product     |
| `POST`   | `/`            | Admin  | Create a product         |
| `PUT`    | `/{product_id}`| Admin  | Update a product         |
| `DELETE` | `/{product_id}`| Admin  | Delete a product         |

### Product Images

Under `/api/v1/products/images`.

| Method | Path                 | Auth  | Description                       |
|--------|----------------------|-------|-----------------------------------|
| `POST` | `/upload-url`        | Admin | Get a presigned S3 upload URL     |
| `POST` | `/confirm`           | Admin | Confirm image upload for a product  |

---

## Management Scripts

Located in `backend/scripts/`.

### `create_admin.py`

Create or update an admin user. Marked as verified automatically.

```bash
python scripts/create_admin.py <username> <password> [--force]
```

### `create_user.py`

Create or update a user (admin or customer). Marked as verified automatically.

```bash
python scripts/create_user.py <username> <password> [--admin] [--force]
```

---

## Request / Response Examples

### Register

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"Secret123!"}'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### List Users (Admin)

```bash
curl http://localhost:8000/api/v1/admin/users \
  -H "Authorization: Bearer <token>"
```

### Update User (Admin)

```bash
curl -X PATCH http://localhost:8000/api/v1/admin/users/<user_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true, "is_active": true, "is_verified": true}'
```

### Delete User (Admin)

```bash
curl -X DELETE http://localhost:8000/api/v1/admin/users/<user_id> \
  -H "Authorization: Bearer <token>"
```

---

## Environment Variables

Create a `.env` file or export these variables.

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/ecommerce

# JWT
SECRET_KEY=your-secret-key-change-me

# AWS / SES (required; registration fails if not configured or send fails)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@example.com

# AWS / S3
S3_BUCKET_NAME=your-bucket

# Frontend URL (used in verification & password reset emails)
FRONTEND_URL=http://localhost:5173

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Running the Application

### Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### With Docker

```bash
docker build -t ecommerce-backend .
docker run --env-file .env -p 8000:8000 ecommerce-backend
```

### Database Migrations

```bash
# Create a new migration (after model changes)
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

---

## Testing

```bash
cd backend
pytest
```

Run with coverage:

```bash
pytest --cov=app --cov-report=term-missing
```
