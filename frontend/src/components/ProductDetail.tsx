import { useCallback, useEffect, useState } from "react";
import { fetchProduct } from "../api/products";
import type { Product } from "../types/product";

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
}

function ProductDetail({ productId, onBack }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProduct(productId);
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (loading) {
    return (
      <div className="product-detail product-detail--loading">
        <p>Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail product-detail--error">
        <p>Error: {error}</p>
        <button onClick={onBack}>Back to Products</button>
        <button onClick={loadProduct}>Retry</button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail product-detail--error">
        <p>Product not found.</p>
        <button onClick={onBack}>Back to Products</button>
      </div>
    );
  }

  return (
    <div className="product-detail">
      <button className="product-detail__back" onClick={onBack}>
        &larr; Back to Products
      </button>

      <div className="product-detail__layout">
        <div className="product-detail__image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-detail__image-placeholder">No Image</div>
          )}
        </div>

        <div className="product-detail__info">
          <span className="product-detail__category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="product-detail__price">${product.price.toFixed(2)}</p>
          <p className="product-detail__stock">
            {product.stock_quantity > 0
              ? `${product.stock_quantity} units in stock`
              : "Out of stock"}
          </p>

          {product.description && (
            <div className="product-detail__description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          <p className="product-detail__meta">
            Added {new Date(product.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
