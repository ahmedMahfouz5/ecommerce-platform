"""Tests for the Product Catalog API."""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import create_product, unique_product_data


class TestListProducts:
    """GET /api/v1/products"""

    async def test_list_empty_products(self, client: AsyncClient):
        """Should return an empty list and pagination metadata."""
        response = await client.get("/api/v1/products")
        assert response.status_code == 200

        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert data["total_pages"] == 1

    async def test_list_products_with_items(self, client: AsyncClient):
        """Should return all created products."""
        await create_product(client, name="Product A")
        await create_product(client, name="Product B")
        await create_product(client, name="Product C")

        response = await client.get("/api/v1/products")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert data["page"] == 1
        assert data["total_pages"] == 1

    async def test_pagination_page_size(self, client: AsyncClient):
        """Should respect page_size query parameter."""
        for i in range(5):
            await create_product(client, name=f"Product {i}")

        response = await client.get("/api/v1/products?pageSize=2")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["page_size"] == 2
        assert data["total_pages"] == 3

    async def test_pagination_page_two(self, client: AsyncClient):
        """Should return correct page when page=2."""
        for i in range(5):
            await create_product(client, name=f"Product {i}")

        response = await client.get("/api/v1/products?page=2&pageSize=2")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) == 2
        assert data["page"] == 2

    async def test_category_filter(self, client: AsyncClient):
        """Should filter products by category."""
        await create_product(client, name="Electronics Item", category="Electronics")
        await create_product(client, name="Books Item", category="Books")

        response = await client.get("/api/v1/products?category=Electronics")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "Electronics"

    async def test_page_zero_is_rejected(self, client: AsyncClient):
        """Should reject page=0 (minimum is 1)."""
        response = await client.get("/api/v1/products?page=0")
        assert response.status_code == 422

    async def test_page_size_exceeds_max(self, client: AsyncClient):
        """Should reject pageSize > 100."""
        response = await client.get("/api/v1/products?pageSize=101")
        assert response.status_code == 422


class TestGetProduct:
    """GET /api/v1/products/{id}"""

    async def test_get_existing_product(self, client: AsyncClient):
        """Should return the requested product."""
        created = await create_product(client)

        response = await client.get(f"/api/v1/products/{created['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == created["id"]
        assert data["name"] == created["name"]
        assert data["price"] == created["price"]

    async def test_get_nonexistent_product_returns_404(self, client: AsyncClient):
        """Should return 404 for a non-existent UUID."""
        fake_id = uuid.uuid4()
        response = await client.get(f"/api/v1/products/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_get_invalid_uuid_returns_422(self, client: AsyncClient):
        """Should return 422 for an invalid UUID format."""
        response = await client.get("/api/v1/products/not-a-uuid")
        assert response.status_code == 422


class TestCreateProduct:
    """POST /api/v1/products"""

    async def test_create_product_success(self, client: AsyncClient):
        """Should create a product and return 201 with the created resource."""
        data = unique_product_data()
        response = await client.post("/api/v1/products", json=data)
        assert response.status_code == 201

        product = response.json()
        assert product["name"] == data["name"]
        assert product["price"] == data["price"]
        assert product["category"] == data["category"]
        assert "id" in product
        assert "created_at" in product
        assert "updated_at" in product

    async def test_create_product_price_rounded(self, client: AsyncClient):
        """Should round price to 2 decimal places."""
        response = await client.post(
            "/api/v1/products", json=unique_product_data(price=19.999)
        )
        assert response.status_code == 201
        assert response.json()["price"] == 20.0

    async def test_create_product_missing_name(self, client: AsyncClient):
        """Should return 422 when required field 'name' is missing."""
        data = unique_product_data()
        del data["name"]
        response = await client.post("/api/v1/products", json=data)
        assert response.status_code == 422

    async def test_create_product_empty_name(self, client: AsyncClient):
        """Should return 422 when name is empty."""
        response = await client.post(
            "/api/v1/products", json=unique_product_data(name="")
        )
        assert response.status_code == 422

    async def test_create_product_negative_price(self, client: AsyncClient):
        """Should return 422 when price is negative."""
        response = await client.post(
            "/api/v1/products", json=unique_product_data(price=-10)
        )
        assert response.status_code == 422

    async def test_create_product_zero_price(self, client: AsyncClient):
        """Should return 422 when price is zero."""
        response = await client.post(
            "/api/v1/products", json=unique_product_data(price=0)
        )
        assert response.status_code == 422

    async def test_create_product_negative_stock(self, client: AsyncClient):
        """Should return 422 when stock_quantity is negative."""
        response = await client.post(
            "/api/v1/products", json=unique_product_data(stock_quantity=-1)
        )
        assert response.status_code == 422

    async def test_create_product_missing_category(self, client: AsyncClient):
        """Should return 422 when category is missing."""
        data = unique_product_data()
        del data["category"]
        response = await client.post("/api/v1/products", json=data)
        assert response.status_code == 422


class TestUpdateProduct:
    """PUT /api/v1/products/{id}"""

    async def test_update_product_full(self, client: AsyncClient):
        """Should update all fields of an existing product."""
        created = await create_product(client)

        response = await client.put(
            f"/api/v1/products/{created['id']}",
            json={
                "name": "Updated Name",
                "description": "Updated description",
                "price": 49.99,
                "stock_quantity": 200,
                "category": "Updated Category",
                "image_url": "https://example.com/updated.jpg",
            },
        )
        assert response.status_code == 200

        product = response.json()
        assert product["name"] == "Updated Name"
        assert product["price"] == 49.99
        assert product["stock_quantity"] == 200

    async def test_update_product_partial(self, client: AsyncClient):
        """Should update only the provided fields."""
        created = await create_product(client, name="Original Name", price=10.0)

        response = await client.put(
            f"/api/v1/products/{created['id']}",
            json={"price": 25.50},
        )
        assert response.status_code == 200

        product = response.json()
        assert product["name"] == "Original Name"  # unchanged
        assert product["price"] == 25.50  # updated

    async def test_update_nonexistent_product_returns_404(self, client: AsyncClient):
        """Should return 404 when updating a non-existent product."""
        fake_id = uuid.uuid4()
        response = await client.put(
            f"/api/v1/products/{fake_id}",
            json={"name": "Ghost"},
        )
        assert response.status_code == 404

    async def test_update_with_invalid_price(self, client: AsyncClient):
        """Should return 422 when updated price is negative."""
        created = await create_product(client)

        response = await client.put(
            f"/api/v1/products/{created['id']}",
            json={"price": -100},
        )
        assert response.status_code == 422


class TestDeleteProduct:
    """DELETE /api/v1/products/{id}"""

    async def test_delete_existing_product(self, client: AsyncClient):
        """Should delete a product and return 204."""
        created = await create_product(client)

        response = await client.delete(f"/api/v1/products/{created['id']}")
        assert response.status_code == 204

        # Verify it's gone
        get_response = await client.get(f"/api/v1/products/{created['id']}")
        assert get_response.status_code == 404

    async def test_delete_nonexistent_product_returns_404(self, client: AsyncClient):
        """Should return 404 when deleting a non-existent product."""
        fake_id = uuid.uuid4()
        response = await client.delete(f"/api/v1/products/{fake_id}")
        assert response.status_code == 404

    async def test_delete_twice_returns_404(self, client: AsyncClient):
        """Should return 404 on second delete of the same product."""
        created = await create_product(client)

        await client.delete(f"/api/v1/products/{created['id']}")
        response = await client.delete(f"/api/v1/products/{created['id']}")
        assert response.status_code == 404


class TestProductResponseShape:
    """Verify response schema integrity."""

    async def test_product_response_has_all_fields(self, client: AsyncClient):
        """Ensure product response includes all expected fields."""
        created = await create_product(client)

        response = await client.get(f"/api/v1/products/{created['id']}")
        product = response.json()

        expected_fields = {
            "id", "name", "description", "price", "stock_quantity",
            "category", "image_url", "created_at", "updated_at",
        }
        assert set(product.keys()) == expected_fields

    async def test_list_response_has_pagination_fields(self, client: AsyncClient):
        """Ensure list response includes pagination metadata."""
        response = await client.get("/api/v1/products")
        data = response.json()

        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data