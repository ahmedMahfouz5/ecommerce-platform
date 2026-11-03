# E-Commerce Platform Backend

A modular **FastAPI** backend for an e-commerce platform. It provides user authentication with email verification, product catalog management, presigned S3 image uploads, and admin user management.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Database Architecture](#database-architecture)
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
- **User Database:** PostgreSQL with SQLAlchemy 2.0 + Alembic migrations
- **Product Database:** MongoDB (motor async driver)
- **Auth:** JWT access tokens (bearer scheme), bcrypt password hashing
- **File Storage:** AWS S3 presigned URLs for product image uploads; public CloudFront CDN URLs for image viewing
- **Email:** AWS SES (required; registration fails if SES is not configured or the send fails)
- **Containerized:** Dockerfile + docker-compose included

---

## Project Structure

```text
backend/
├── alembic/                # PostgreSQL migrations (users)
├── app/
│   ├── config.py           # Pydantic settings
│   ├── core/
│   │   ├── database.py       # PostgreSQL engine & session
│   │   └── mongodb.py        # MongoDB async client
│   ├── modules/
│   │   ├── auth/             # Authentication module (PostgreSQL)
│   │   └── products/         # Product catalog module (MongoDB)
│   ├── routers/              # Extra routers (health)
│   └── services/             # Email (SES) + S3 helpers
├── scripts/                 # CLI management & seed scripts
├── tests/                   # Pytest test suite
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

---

## Database Architecture

| Entity  | Database   | Notes                                            |
|---------|-----------|--------------------------------------------------|
| `users` | PostgreSQL| SQLAlchemy model, Alembic-managed                |
| `products`| MongoDB  | Pydantic model, stored in `products` collection  |

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
| `verification_token_expires_at`| DateTime | Expiry for verification token            |
| `reset_token`                 | String    | Password reset token                       |
| `reset_token_expires_at`      | DateTime  | Expiry for reset token                     |
| `created_at` / `updated_at`   | DateTime  | Auto-managed timestamps                    |

### `products`

Products are stored as documents in MongoDB. Each product has the following fields:

| Field              | Type          | Required | Description / Example                          |
|--------------------|---------------|----------|--------------------------------------------------|
| `id`               | string        | yes      | Unique product identifier                        |
| `title`            | string        | yes      | Product name                                     |
| `description`      | string        | yes      | Detailed product text                            |
| `price`            | number        | yes      | Current price in USD                             |
| `categories`       | string[]      | yes      | Taxonomy tags, e.g. `["dairy", "milk"]`          |
| `image`            | string[]      | yes      | S3 object keys for product images                |
| `rating`           | integer       | yes      | Product rating, `1` to `5`                     |
| `amount`           | integer       | yes      | Current stock quantity                         |
| `shop_category`    | string        | yes      | Top-level section, e.g. `grocery`, `clothing`  |
| `unit_of_measure`  | string        | yes      | Unit of sale, e.g. `kg`, `liter`, `pc(s)`      |
| `oldPrice`         | number        | no       | Original price before discount (sale flag)       |
| `sizes`            | string[]      | no       | Available garment sizes                        |
| `colors`           | string[]      | no       | Color variants                                   |
| `authors`          | string[]      | no       | Book authors (for `shop_category = "books"`)     |
| `created_at`       | datetime      | yes      | Auto-managed                                     |
| `updated_at`       | datetime      | yes      | Auto-managed                                     |

- If `oldPrice` is present, the product is flagged as being on sale.
- Size/color requests are matched against the optional `sizes` and `colors` arrays.
- Prices are formatted cleanly and stock is reported via `amount`.

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

| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| `GET`  | `/health`                   | Basic health check                   |
| `GET`  | `/health/live`              | Liveness probe                         |
| `GET`  | `/health/ready`             | Readiness probe                        |
| `GET`  | `/health/db_connection`     | PostgreSQL connectivity                |
| `GET`  | `/health/mongodb`           | MongoDB connectivity                   |
| `GET`  | `/health/db_migration`      | Alembic migration status               |
| `GET`  | `/health/s3`                | S3 connectivity                        |

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

Under `/api/v1/products/{product_id}`.

| Method | Path                        | Auth  | Description                                  |
|--------|-----------------------------|-------|----------------------------------------------|
| `GET`  | `/image-url`                | None  | Get public CloudFront CDN URL(s)            |
| `POST` | `/images/upload-url`        | Admin | Get a presigned S3 upload URL                |
| `PUT`  | `/images/confirm`           | Admin | Confirm image upload for a product           |

The backend stores S3 object keys in the `image` array. Public image URLs are built at runtime from the configured `CDN_ASSETS_DOMAIN`.

---

## Management Scripts

Located in `backend/scripts/`.

### `seed_products.py`

Seed MongoDB with products from a JSON file. The file can either contain a top-level `products` array or be a raw array of products.

```bash
python -m scripts.seed_products /path/to/products.json
python -m scripts.seed_products --clear /path/to/products.json
```

### `create_admin.py`

Create or update an admin user in PostgreSQL. Marked as verified automatically.

```bash
python scripts/create_admin.py <username> <password> [--force]
```

### `create_user.py`

Create or update a user (admin or customer) in PostgreSQL. Marked as verified automatically.

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

### Create Product (Admin)

```bash
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Apples",
    "description": "Fresh red apples.",
    "price": 1.6,
    "categories": ["fruits-and-vegetables", "fruits"],
    "image": [],
    "unit_of_measure": "kg",
    "amount": 30,
    "rating": 4,
    "shop_category": "grocery"
  }'
```

### Request Image Upload URL (Admin)

```bash
curl -X POST http://localhost:8000/api/v1/products/1/images/upload-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content_type": "image/png", "file_size_bytes": 524288}'
```

### Confirm Image Upload (Admin)

```bash
curl -X PUT http://localhost:8000/api/v1/products/1/images/confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"object_key": "products/1/abc123.png"}'
```

---

## Environment Variables

Create a `.env` file or export these variables.

```bash
# PostgreSQL (users)
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/ecommerce

# MongoDB (products)
MONGODB_URL=mongodb://mongo:27017/ecommerce

# JWT
SECRET_KEY=your-secret-key-change-me

# AWS / SES (required; registration fails if not configured or send fails)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
SES_SENDER_EMAIL=noreply@example.com

# AWS / S3
S3_ASSETS_BUCKET=your-bucket
S3_PRESIGNED_URL_EXPIRATION_SECONDS=300

# Public CloudFront CDN domain used for product images
CDN_ASSETS_DOMAIN=cdn.yourdomain.com

# Frontend URL (used in verification & password reset emails)
FRONTEND_URL=http://localhost:5173

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Running the Application

### With Docker Compose

```bash
cd backend
docker compose up --build
```

This starts PostgreSQL, MongoDB, and the backend.

### Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Database Migrations (PostgreSQL only)

```bash
# Create a new migration (after model changes)
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Seeding Products

```bash
python -m scripts.seed_products /path/to/products.json
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
