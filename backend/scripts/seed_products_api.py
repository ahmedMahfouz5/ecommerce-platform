"""Seed products by calling the create-product API.

Reads a JSON file of the form {"products": [...]}, logs in as an admin,
then POSTs each product to /api/v1/products.  Image paths are converted to
S3 object keys matching the existing public asset layout:

    /groceryImages/apple.png  ->  public/groceryImages/apple.png

The stored key can then be served by the configured CDN.

Usage:
    python -m scripts.seed_products_api /path/to/db.json
    python -m scripts.seed_products_api /path/to/db.json \
        --base-url http://localhost:8000 \
        --username admin \
        --password admin

Environment (used when args are not provided):
    API_BASE_URL (default: http://localhost:8000)
    ADMIN_USERNAME
    ADMIN_PASSWORD
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

DEFAULT_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
DEFAULT_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
DEFAULT_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")


def to_s3_object_key(image_path: str) -> str:
    """Convert an image path into the S3 object key used by the public bucket.

    Examples:
        /groceryImages/apple.png  -> public/groceryImages/apple.png
        groceryImages/apple.png   -> public/groceryImages/apple.png
        public/groceryImages/...   -> public/groceryImages/... (unchanged)
    """
    cleaned = image_path.strip().lstrip("/")
    if cleaned.startswith("public/"):
        return cleaned
    return f"public/{cleaned}"


def normalize_product(product: dict) -> dict:
    """Return a product dict ready for the create-product API."""
    normalized: dict = {
        "title": product["title"],
        "description": product["description"],
        "price": product["price"],
        "categories": list(product.get("categories", []) or []),
        "rating": product.get("rating", 4),
        "amount": product.get("amount", 0),
        "shop_category": product["shop_category"],
        "unit_of_measure": product["unit_of_measure"],
    }

    # Optional fields
    for optional in ("oldPrice", "sizes", "colors", "authors"):
        if optional in product and product[optional] is not None:
            normalized[optional] = product[optional]

    # Convert image paths to S3 object keys.
    raw_images = product.get("image") or []
    if isinstance(raw_images, str):
        raw_images = [raw_images]
    normalized["image"] = [to_s3_object_key(img) for img in raw_images]

    return normalized


def http_post_json(
    url: str, payload: dict, headers: dict | None = None
) -> tuple[int, dict | str]:
    """POST JSON to a URL and return (status, parsed_body_or_text)."""
    data = json.dumps(payload).encode("utf-8")
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)

    req = urllib.request.Request(
        url,
        data=data,
        headers=request_headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            try:
                return response.status, json.loads(body)
            except json.JSONDecodeError:
                return response.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
        try:
            return exc.code, json.loads(body)
        except json.JSONDecodeError:
            return exc.code, body


def login(base_url: str, username: str, password: str) -> str:
    url = urljoin(base_url, "/api/v1/auth/login")
    status, body = http_post_json(url, {"username": username, "password": password})
    if status != 200 or not isinstance(body, dict):
        raise RuntimeError(f"Login failed ({status}): {body}")
    token = body.get("access_token")
    if not token:
        raise RuntimeError(f"Login response did not include access_token: {body}")
    return str(token)


def create_product(base_url: str, token: str, product: dict) -> tuple[bool, dict | str]:
    url = urljoin(base_url, "/api/v1/products")
    headers = {"Authorization": f"Bearer {token}"}
    status, body = http_post_json(url, product, headers=headers)
    if status == 201:
        return True, body if isinstance(body, dict) else {}
    return False, body if isinstance(body, (dict, str)) else str(body)


def run(file_path: Path, base_url: str, username: str, password: str) -> int:
    raw = file_path.read_text(encoding="utf-8")
    data = json.loads(raw)

    if isinstance(data, dict):
        products = data.get("products", [])
    elif isinstance(data, list):
        products = data
    else:
        print(
            "JSON file must contain a 'products' array or a raw list of products.",
            file=sys.stderr,
        )
        return 1

    if not products:
        print("No products found in file.")
        return 0

    print(f"Seeding {len(products)} products via {base_url}")

    try:
        token = login(base_url, username, password)
        print(f"Authenticated as {username}.")
    except RuntimeError as exc:
        print(f"Login failed: {exc}", file=sys.stderr)
        return 1

    success_count = 0
    for index, raw_product in enumerate(products, start=1):
        product = normalize_product(raw_product)
        title = product["title"]

        ok, result = create_product(base_url, token, product)
        if ok:
            success_count += 1
            print(f"[{index}/{len(products)}] Created: {title} (id={result.get('id')})")
        else:
            print(
                f"[{index}/{len(products)}] Failed: {title} (HTTP result: {result})",
                file=sys.stderr,
            )

    print(f"Done. {success_count}/{len(products)} products created.")
    return 0 if success_count == len(products) else 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed products via the create-product API"
    )
    parser.add_argument("file", type=Path, help="Path to the products JSON file")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Backend base URL")
    parser.add_argument("--username", default=DEFAULT_USERNAME, help="Admin username")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Admin password")
    args = parser.parse_args()

    if not args.file.exists():
        print(f"File not found: {args.file}", file=sys.stderr)
        return 1
    return run(args.file, args.base_url, args.username, args.password)


if __name__ == "__main__":
    raise SystemExit(main())
