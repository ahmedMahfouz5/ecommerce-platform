import { useCallback, useEffect, useRef, useState } from "react";
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
  const [search, setSearch] = useState("");

  // Track the in-flight request so we can cancel it on new requests
  const abortRef = useRef<AbortController | null>(null);

  const pageSize = 12;

  const loadProducts = useCallback(async () => {
    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(
        page,
        pageSize,
        category || undefined,
        controller.signal,
      );
      // Client-side search filtering (backend doesn't support search yet)
      let items = data.items;
      if (search.trim()) {
        const term = search.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term)),
        );
      }

      setProducts(items);
      setTotalPages(search.trim() ? 1 : data.total_pages);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Failed to load products",
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, category, search]);

  useEffect(() => {
    loadProducts();
    return () => abortRef.current?.abort();
  }, [loadProducts]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  return (
    <div className="product-list">
      <div className="product-list__header">
        <h2>Products</h2>
        <div className="product-list__filters">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="product-list__filter-input"
            aria-label="Search products"
          />
          <input
            type="text"
            placeholder="Filter by category..."
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="product-list__filter-input"
            aria-label="Filter by category"
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
        <div className="product-list__state" role="status">
          <p>Loading products...</p>
        </div>
      )}

      {error && (
        <div className="product-list__state product-list__state--error" role="alert">
          <p>Error: {error}</p>
          <button onClick={loadProducts}>Retry</button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="product-list__state product-list__state--empty">
          <p>No products found.</p>
          {(category || search) && <p>Try a different filter or search term.</p>}
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

          {totalPages > 1 && !search.trim() && (
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
