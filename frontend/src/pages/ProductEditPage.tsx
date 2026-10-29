import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchProduct, updateProduct, deleteProduct } from "../api/products";
import { ProductForm } from "../components/ProductForm";
import { ImageUploader } from "../components/ImageUploader";
import type { ProductUpdate } from "../types/product";

export function ProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  const [product, setProduct] = useState<Awaited<ReturnType<typeof fetchProduct>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const p = await fetchProduct(productId, ctrl.signal);
      setProduct(p);
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
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const handleUpdate = async (data: ProductUpdate) => {
    if (!productId) return;
    setUpdating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await updateProduct(productId, data);
      setSuccessMsg("Product updated.");
      await load(); // refresh
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Failed to update product",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    if (!window.confirm("Delete this product permanently?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(productId);
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Failed to delete product",
      );
      setDeleting(false);
    }
  };

  const handleImageUploaded = () => {
    setSuccessMsg("Image uploaded successfully.");
    load(); // refresh to pick up the new image_url
  };

  if (loading) {
    return (
      <div className="product-edit" role="status">
        <p>Loading product...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="product-edit product-edit--error" role="alert">
        <p>{error}</p>
        <button onClick={() => navigate("/admin")}>Back to Admin</button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-edit product-edit--error">
        <p>Product not found.</p>
        <button onClick={() => navigate("/admin")}>Back to Admin</button>
      </div>
    );
  }

  return (
    <div className="product-edit">
      <button className="product-edit__back" onClick={() => navigate("/admin")}>
        &larr; Back to Admin
      </button>

      <h2>Edit: {product.name}</h2>

      {successMsg && (
        <div className="product-edit__success" role="status">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="product-edit__error" role="alert">
          {error}
        </div>
      )}

      <section className="product-edit__image-section">
        <h3>Product Image</h3>
        {product.image_download_url ? (
          <div className="product-edit__current-image">
            <img src={product.image_download_url} alt={product.name} />
          </div>
        ) : (
          <p className="product-edit__no-image">No image set.</p>
        )}
        {productId && (
          <ImageUploader
            productId={productId}
            onUploaded={handleImageUploaded}
          />
        )}
      </section>

      <section className="product-edit__form-section">
        <h3>Edit Details</h3>
        <ProductForm
          onSubmit={handleUpdate}
          submitting={updating}
          submitLabel="Update Product"
          initial={{
            name: product.name,
            description: product.description,
            price: product.price,
            stock_quantity: product.stock_quantity,
            category: product.category,
          }}
        />
      </section>

      <section className="product-edit__danger">
        <h3>Danger Zone</h3>
        <button
          className="product-edit__delete-btn"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Product"}
        </button>
      </section>
    </div>
  );
}

