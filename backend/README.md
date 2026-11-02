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
- **Email:** AWS SES (required; registration fails if SES is not configured or the send fails)
- **Containerized:** Dockerfile included

---

## Project Structure

### Register (Customer)

Registers a new customer account and sends a verification email.
If email sending fails (e.g. SES misconfigured or rejected by AWS), the
registration is rolled back and a `503 Service Unavailable` error is returned.


# AWS / SES (required; registration fails if not configured or send fails)
SES_SENDER_EMAIL=noreply@example.com

