import { useCallback, useEffect, useState } from "react";
import { fetchProducts } from "../api/products";
import type { Product } from "../types/product";
import ProductCard from "./ProductCard";

interface ProductListProps {
  onSelectProduct: (id: string) => void;
}

function ProductList({ onSelectProduct }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("");

  const pageSize = 12;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(page, pageSize, category || undefined);
      setProducts(data.items);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset to page 1 when category changes
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  return (
    <div className="product-list">
      <div className="product-list__header">
        <h2>Products</h2>
        <div className="product-list__filters">
          <input
            type="text"
            placeholder="Filter by category..."
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="product-list__filter-input"
          />
          {category && (
            <button
              className="product-list__clear-filter"
              onClick={() => handleCategoryChange("")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="product-list__state">
          <p>Loading products...</p>
        </div>
      )}

      {error && (
        <div className="product-list__state product-list__state--error">
          <p>Error: {error}</p>
          <button onClick={loadProducts}>Retry</button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="product-list__state product-list__state--empty">
          <p>No products found.</p>
          {category && <p>Try a different category filter.</p>}
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="product-list__pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductList;
