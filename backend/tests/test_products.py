"""Tests for the Product Catalog API."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestListProducts:
    """GET /api/v1/products"""

    async def test_list_empty_products(self, client: AsyncClient):
        """Should return an empty list and pagination metadata matching ProductListResponse."""
        response = await client.get("/api/v1/products")
        assert response.status_code == 200

        data = response.json()
        # Match ProductListResponse schema fields exactly
        assert set(data.keys()) == {"items", "total", "page", "page_size", "total_pages"}
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert data["total_pages"] == 1
