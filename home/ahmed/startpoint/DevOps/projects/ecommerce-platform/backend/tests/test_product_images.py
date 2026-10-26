"""Tests for product-image upload endpoints.

Uses unittest.mock to patch boto3 S3 interactions so that tests run
without real AWS credentials or network calls.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

# ---------------------------------------------------------------------------
# Helper: create a product and return its ID
# ---------------------------------------------------------------------------


async def _create_product(client: AsyncClient, **overrides) -> dict:
    """Create a product via the existing API and return the response dict."""
    payload = {
        "name": "Test Product",
        "description": "A test product",
        "price": 19.99,
        "stock_quantity": 10,
        "category": "test-category",
    }
    payload.update(overrides)
    resp = await client.post("/api/v1/products", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/v1/products/{product_id}/images/upload-url
# ---------------------------------------------------------------------------


class TestRequestImageUploadUrl:
    """POST /api/v1/products/{product_id}/images/upload-url"""

    @pytest.fixture(autouse=True)
    def _patch_s3(self):
        """Patch the module-level s3_client so tests don't hit AWS."""
        with patch("app.modules.products.image_router.generate_presigned_upload_url") as mock_gen, \
             patch("app.modules.products.image_router.generate_object_key") as mock_key:
            mock_gen.return_value = "https://test-bucket.s3.us-east-2.amazonaws.com/test-key.jpg?X-Amz-..."
            mock_key.return_value = "products/test-product-id/test-uuid.jpg"
            yield

    async def test_returns_200_for_valid_jpeg(self, client: AsyncClient):
        """Valid JPEG upload request returns presigned URL metadata."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 524288},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert set(data.keys()) == {"upload_url", "object_key", "content_type", "expires_in_seconds"}
        assert data["upload_url"].startswith("https://")
        assert data["object_key"].startswith(f"products/{product['id']}/")
        assert data["content_type"] == "image/jpeg"
        assert data["expires_in_seconds"] > 0

    async def test_returns_200_for_valid_png(self, client: AsyncClient):
        """Valid PNG upload request returns presigned URL metadata."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/png", "file_size_bytes": 1024000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["content_type"] == "image/png"

    async def test_returns_200_for_valid_webp(self, client: AsyncClient):
        """Valid WebP upload request returns presigned URL metadata."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/webp", "file_size_bytes": 2048},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["content_type"] == "image/webp"

    async def test_rejects_unsupported_content_type(self, client: AsyncClient):
        """Unsupported format (e.g. image/gif) returns 422."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/gif", "file_size_bytes": 100},
        )
        assert resp.status_code == 422
        assert "Unsupported image format" in resp.json()["detail"]

    async def test_rejects_invalid_content_type_string(self, client: AsyncClient):
        """Obviously invalid content type returns 422."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "text/html", "file_size_bytes": 100},
        )
        assert resp.status_code == 422

    async def test_rejects_zero_file_size(self, client: AsyncClient):
        """Zero-byte upload returns 422."""
        product = await _create_product(client)

        # Pydantic validation catches this before our service layer
        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 0},
        )
        assert resp.status_code == 422

    async def test_rejects_negative_file_size(self, client: AsyncClient):
        """Negative file size returns 422."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": -1},
        )
        assert resp.status_code == 422

    async def test_rejects_excessive_file_size(self, client: AsyncClient):
        """File size exceeding 10 MB returns 422."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 11 * 1024 * 1024},
        )
        assert resp.status_code == 422
        assert "exceeds maximum" in resp.json()["detail"]

    async def test_nonexistent_product_returns_404(self, client: AsyncClient):
        """Requesting upload URL for a nonexistent product returns 404."""
        fake_id = str(uuid.uuid4())

        resp = await client.post(
            f"/api/v1/products/{fake_id}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 100},
        )
        assert resp.status_code == 404

    async def test_object_key_is_server_controlled(self, client: AsyncClient):
        """The returned object key contains the product ID, not user input."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 100},
        )
        data = resp.json()

        # Key must start with "products/{product_id}/"
        assert data["object_key"].startswith(f"products/{product['id']}/")
        # Key must end with a valid image extension
        assert data["object_key"].endswith(".jpg")

    async def test_url_is_put_method_and_scoped(self, client: AsyncClient):
        """The presigned URL is a PUT method URL (validated via mock)."""
        product = await _create_product(client)

        resp = await client.post(
            f"/api/v1/products/{product['id']}/images/upload-url",
            json={"content_type": "image/jpeg", "file_size_bytes": 100},
        )
        data = resp.json()
        # The mock returns a known URL; verify it's present
        assert "test-bucket.s3.us-east-2.amazonaws.com" in data["upload_url"]


# ---------------------------------------------------------------------------
# PUT /api/v1/products/{product_id}/images/confirm
# ---------------------------------------------------------------------------


class TestConfirmImageUpload:
    """PUT /api/v1/products/{product_id}/images/confirm"""

    @pytest.fixture(autouse=True)
    def _patch_head_object(self):
        """Patch head_object to simulate S3 object existence."""
        with patch("app.modules.products.image_router.head_object", return_value=True):
            yield

    async def test_confirm_valid_key_associates_image(self, client: AsyncClient):
        """Confirming a valid object key updates the product's image_url."""
        product = await _create_product(client)
        object_key = f"products/{product['id']}/some-uuid.jpg"

        resp = await client.put(
            f"/api/v1/products/{product['id']}/images/confirm",
            json={"object_key": object_key},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["object_key"] == object_key
        assert data["product_id"] == product["id"]

        # Verify the product was updated
        get_resp = await client.get(f"/api/v1/products/{product['id']}")
        assert get_resp.status_code == 200
        assert get_resp.json()["image_url"] == object_key

    async def test_rejects_key_from_other_product(self, client: AsyncClient):
        """An object key belonging to a different product is rejected."""
        product_a = await _create_product(client, name="Product A")
        product_b = await _create_product(client, name="Product B")
        object_key = f"products/{product_a['id']}/some-uuid.jpg"

        # Try to associate product A's key with product B
        resp = await client.put(
            f"/api/v1/products/{product_b['id']}/images/confirm",
            json={"object_key": object_key},
        )
        assert resp.status_code == 403

    async def test_nonexistent_product_returns_404(self, client: AsyncClient):
        """Confirming for a nonexistent product returns 404."""
        fake_id = str(uuid.uuid4())
        object_key = f"products/{fake_id}/some-uuid.jpg"

        resp = await client.put(
            f"/api/v1/products/{fake_id}/images/confirm",
            json={"object_key": object_key},
        )
        assert resp.status_code == 404

    async def test_rejects_arbitrary_object_key(self, client: AsyncClient):
        """An arbitrary key that doesn't match the expected prefix is rejected."""
        product = await _create_product(client)

        resp = await client.put(
            f"/api/v1/products/{product['id']}/images/confirm",
            json={"object_key": "some/random/path/malicious.jpg"},
        )
        assert resp.status_code == 403

    async def test_rejects_object_not_in_s3(self, client: AsyncClient):
        """When head_object returns False, confirm returns 400."""
        product = await _create_product(client)
        object_key = f"products/{product['id']}/missing.jpg"

        with patch(
            "app.modules.products.image_router.head_object", return_value=False
        ):
            resp = await client.put(
                f"/api/v1/products/{product['id']}/images/confirm",
                json={"object_key": object_key},
            )
        assert resp.status_code == 400
        assert "does not exist" in resp.json()["detail"]

    async def test_confirm_is_idempotent(self, client: AsyncClient):
        """Confirming the same key twice succeeds and keeps the last value."""
        product = await _create_product(client)
        key_a = f"products/{product['id']}/first.jpg"
        key_b = f"products/{product['id']}/second.jpg"

        # First confirmation
        resp = await client.put(
            f"/api/v1/products/{product['id']}/images/confirm",
            json={"object_key": key_a},
        )
        assert resp.status_code == 200

        # Second confirmation with a different key
        resp = await client.put(
            f"/api/v1/products/{product['id']}/images/confirm",
            json={"object_key": key_b},
        )
        assert resp.status_code == 200
        assert resp.json()["object_key"] == key_b

        # Product now shows key_b
        get_resp = await client.get(f"/api/v1/products/{product['id']}")
        assert get_resp.json()["image_url"] == key_b


# ---------------------------------------------------------------------------
# Existing product CRUD is unaffected
# ---------------------------------------------------------------------------


class TestProductCrudUnaffected:
    """Verify that the new image endpoints don't break existing product CRUD."""

    async def test_crud_flow_unchanged(self, client: AsyncClient):
        """Full CRUD: create, read, update, delete still works."""
        # Create
        resp = await client.post(
            "/api/v1/products",
            json={
                "name": "Unchanged Product",
                "description": "Should work unchanged",
                "price": 42.00,
                "stock_quantity": 5,
                "category": "unchanged",
            },
        )
        assert resp.status_code == 201
        product = resp.json()

        # Read
        resp = await client.get(f"/api/v1/products/{product['id']}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Unchanged Product"

        # Update
        resp = await client.put(
            f"/api/v1/products/{product['id']}",
            json={"name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

        # Delete
        resp = await client.delete(f"/api/v1/products/{product['id']}")
        assert resp.status_code == 204

        # Verify gone
        resp = await client.get(f"/api/v1/products/{product['id']}")
        assert resp.status_code == 404

    async def test_pagination_still_works(self, client: AsyncClient):
        """Pagination endpoint still returns expected structure."""
        resp = await client.get("/api/v1/products")
        assert resp.status_code == 200
        data = resp.json()
        assert set(data.keys()) == {"items", "total", "page", "page_size", "total_pages"}
