# E-Commerce Platform Frontend

A **React + TypeScript + Vite** single-page application for the e-commerce platform. It provides customer-facing product browsing, authentication flows, and an admin dashboard for product and user management.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [Available Scripts](#available-scripts)
5. [Environment Variables](#environment-variables)
6. [Authentication](#authentication)
7. [Header / Navigation](#header--navigation)
8. [Routing](#routing)
9. [API Client](#api-client)
10. [Pages & Features](#pages--features)
11. [Design System](#design-system)
12. [Running the Application](#running-the-application)
13. [Building for Production](#building-for-production)
14. [Testing](#testing)

---

## Overview

The frontend communicates with the FastAPI backend over REST. It uses session storage to persist the JWT access token and an admin flag. Admin-only routes are protected by the `ProtectedRoute` component.

---

## Project Structure

```text
frontend/
├── src/
│   ├── api/              # API client and endpoint modules
│   │   ├── auth.ts       # Auth API calls
│   │   ├── users.ts      # Admin user management API calls
│   │   ├── products.ts   # Product API calls
│   │   ├── images.ts     # Image upload API calls
│   │   └── client.ts     # Centralized fetch wrapper
│   ├── auth/             # Authentication context & protected routes
│   │   ├── AuthContext.tsx
│   │   └── ProtectedRoute.tsx
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route-level page components
│   ├── lib/              # Utility functions
│   ├── types/            # Shared TypeScript types
│   └── main.tsx          # Application entry point
├── public/               # Static assets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **UI Components:** shadcn/ui-inspired custom components
- **Icons:** Lucide React

---

## Available Scripts

| Command              | Description                          |
|----------------------|--------------------------------------|
| `npm install`        | Install dependencies                 |
| `npm run dev`        | Start the Vite dev server            |
| `npm run build`      | Type-check and build for production  |
| `npm run preview`    | Preview the production build locally   |
| `npm run test`       | Run the Vitest test suite              |

---

## Environment Variables

The frontend uses a relative API base path by default, so no environment variables are required for local development when using the Vite proxy.

| Variable             | Description                                         |
|----------------------|-----------------------------------------------------|
| `VITE_API_BASE_URL`  | Optional override for the backend API base URL        |

If you need to point to a different backend, create a `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Product Images

Product images are served through a CloudFront CDN. The frontend uses the `image_download_url` array returned by the backend, which contains public URLs like `https://cdn.yourdomain.com/products/<id>/<filename>.webp`. No client-side URL construction is required.

---

## Authentication

- The `AuthContext` manages login state.
- The JWT token and admin flag are stored in `sessionStorage`.
- The `ProtectedRoute` component blocks unauthenticated or non-admin users.
- Admins see extra routes and actions; regular customers can browse products and manage their account.

---

## Header / Navigation

The top-of-page header is available on every route and provides the main entry points for browsing, searching, and account access. An `AnnouncementBar` above the header shows free-shipping info and trust signals.

| Element            | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **Logo**           | Brand logo that links back to the home page (`/`). Uses the Playfair Display brand font. |
| **Category Menu**  | Main category navigation; allows customers to filter products by category. Categories are defined in `src/data/categories.ts`. |
| **Search Bar**     | Live/keyword search input for finding products by name or description.      |
| **Cart Icon**      | Displays the current cart item count and links to the cart summary.         |
| **Account / Login**| Shows login link when anonymous, or account dropdown when authenticated.    |

- Authenticated admin users see additional navigation links (e.g., **Admin Dashboard**).
- The header is responsive and collapses into a mobile menu on smaller viewports.

---

## Routing

| Route                       | Access      | Description                              |
|-----------------------------|-------------|------------------------------------------|
| `/`                         | Public      | Home / landing page                      |
| `/products`                  | Public      | Product listing                          |
| `/products/:productId`       | Public      | Product detail                           |
| `/login`                    | Public      | Login page                               |
| `/register`                 | Public      | Customer registration                    |
| `/verify-email`             | Public      | Email verification page                  |
| `/resend-verification`      | Public      | Resend verification email                |
| `/forgot-password`          | Public      | Request password reset                   |
| `/reset-password`           | Public      | Reset password                           |
| `/admin`                    | Admin       | Admin dashboard (create products)        |
| `/admin/register`           | Admin       | Register another admin                   |
| `/admin/products/:productId`| Admin       | Edit a product (including image upload)  |
| `/admin/users`              | Admin       | User management dashboard                |

---

## API Client

`src/api/client.ts` is the central HTTP client. It:

- Sends requests to `/api/v1`
- Attaches the `Authorization: Bearer <token>` header automatically
- Parses JSON error bodies and throws typed `ApiError`
- Provides helpers: `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`

---

## Pages & Features

### Public

- **HomePage** — landing page with hero slider, featured categories, Hot Deals, Best Sellers, and New Arrivals. Sections are built from non-overlapping product subsets and hidden automatically when empty.
- **ProductList** — browse products
- **ProductDetail** — view product details
- **LoginPage** — authenticate
- **RegisterPage** — create customer account
- **VerifyEmailPage** — verify email from link
- **ResendVerificationPage** — request a new verification email
- **ForgotPasswordPage** / **ResetPasswordPage** — password reset flow

### Admin

- **AdminPage** — create new products, navigate to user dashboard or admin registration
- **AdminRegisterPage** — register additional admins
- **ProductEditPage** — edit existing products
- **UsersDashboardPage** — list all users, toggle `is_admin` / `is_active` / `is_verified`, and delete users

---

## Running the Application

### Locally

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

### With Docker

```bash
docker build -t ecommerce-frontend .
docker run -p 80:80 ecommerce-frontend
```

The production image uses nginx to serve the built SPA and proxy `/api` requests to the backend.

---

## Building for Production

```bash
npm run build
```

The compiled output is placed in `frontend/dist`.

---

## Testing

```bash
npm run test
```

Tests are written with Vitest and React Testing Library.

---

## Design System

### Typography

- **Body:** Inter (sans-serif)
- **Brand / Logo:** Playfair Display (serif)
- Headings and product names are intentionally sized so section titles (`~28–30 px`) clearly outrank product titles (`15 px`).
- Uppercase labels (categories, footer headings, badges) use `tracking-widest` and a minimum size of `13 px`.

### Contrast & Hierarchy

- Footer and secondary text use `text-foreground/80` instead of low-contrast `text-muted-foreground` to improve accessibility.
- Product prices are rendered in bold/large green text; discounted old prices are smaller with a strikethrough and a “Save $X” label.
- Sale products receive a red `-XX%` badge on the product card image.

### Shared Categories

Categories are defined once in `src/data/categories.ts` and drive both the header navigation and the homepage featured-category tiles.

---

## Backend Dependency

This frontend expects the backend to expose the API at `/api/v1`. Make sure the backend is running and reachable. In development, Vite proxies `/api` to the backend; see `vite.config.ts` for details.
