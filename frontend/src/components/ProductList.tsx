import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts } from "../api/products";
import type { Product } from "../types/product";
import ProductCard from "./ProductCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Filter, X, Loader2, AlertCircle, PackageOpen } from "lucide-react";

interface ProductListProps {
  onSelectProduct: (id: string) => void;
}

function ProductList({ onSelectProduct }: ProductListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

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
        search.trim() || undefined,
        controller.signal,
      );

      setProducts(data.items);
      setTotalPages(data.total_pages);
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

  const updateSearchParams = (newCategory: string, newSearch: string) => {
    const params = new URLSearchParams();
    if (newCategory) params.set("category", newCategory);
    if (newSearch.trim()) params.set("q", newSearch.trim());
    setSearchParams(params, { replace: true });
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    updateSearchParams(cat, search);
    setPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearch(q);
    updateSearchParams(category, q);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Products
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <div className="relative flex-1 sm:min-w-[180px]">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by category..."
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="pl-9"
              aria-label="Filter by category"
            />
          </div>
          {category && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCategoryChange("")}
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16"
          role="status"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-16"
          role="alert"
        >
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">Error: {error}</p>
          <Button variant="outline" size="sm" onClick={loadProducts}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && products.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16">
          <PackageOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No products found.</p>
          {(category || search) && (
            <p className="text-xs text-muted-foreground">
              Try a different filter or search term.
            </p>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductList;
