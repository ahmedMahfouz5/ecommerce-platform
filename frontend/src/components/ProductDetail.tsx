import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProduct } from "../api/products";
import type { Product } from "../types/product";
import { Button } from "./ui/button";
import { Loader2, AlertCircle, ArrowLeft, Calendar } from "lucide-react";

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
}

function ProductDetail({ productId, onBack }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadProduct = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProduct(productId, controller.signal);
      setProduct(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Failed to load product",
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
    return () => abortRef.current?.abort();
  }, [loadProduct]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-20"
        role="status"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-20"
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Error: {error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Products
          </Button>
          <Button variant="outline" size="sm" onClick={loadProduct}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-20">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Products
        </Button>
      </div>

      <div className="grid gap-8 p-4 sm:p-6 lg:grid-cols-2">
        {/* Image */}
        <div className="overflow-hidden rounded-xl bg-muted aspect-square">
          {product.image_download_url ? (
            <img
              src={product.image_download_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              No Image
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <span className="inline-block w-fit text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {product.category}
          </span>
          <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatPrice(product.price)}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {product.stock_quantity > 0
              ? `${product.stock_quantity} units in stock`
              : "Out of stock"}
          </p>

          {product.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Description
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Added {new Date(product.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
