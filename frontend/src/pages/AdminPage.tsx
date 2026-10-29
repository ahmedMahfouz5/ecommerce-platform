import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProductForm } from "../components/ProductForm";
import { ImageUploader } from "../components/ImageUploader";
import type { ProductCreate } from "../types/product";
import { createProduct } from "../api/products";

export function AdminPage() {
  const { logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Track the newly created product's ID so we can show the image uploader
  const [newProductId, setNewProductId] = useState<string | null>(null);

  const handleCreate = async (data: ProductCreate) => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const created = await createProduct(data);
      setSuccessMsg(`Product "${created.name}" created successfully.`);
      setNewProductId(created.id);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Failed to create product",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUploaded = () => {
    setSuccessMsg("Image uploaded successfully.");
    navigate(`/products/${newProductId}`);
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2>Admin Dashboard</h2>
        <div className="admin-page__actions">
          <Link to="/admin/register" className="admin-page__nav-btn">
            Register Admin
          </Link>
          {isLoggedIn && (
            <button className="admin-page__logout-btn" onClick={() => logout()}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="admin-page__success" role="status">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="admin-page__error" role="alert">
          {error}
        </div>
      )}

      {!newProductId ? (
        <section className="admin-page__create">
          <h3>Create New Product</h3>
          <ProductForm onSubmit={handleCreate} submitting={submitting} />
        </section>
      ) : (
        <section className="admin-page__upload-image">
          <h3>Upload Product Image</h3>
          <p>Product created — add an image now or skip.</p>
          <ImageUploader
            productId={newProductId}
            onUploaded={handleImageUploaded}
          />
          <button
            className="admin-page__skip-btn"
            onClick={() => navigate(`/products/${newProductId}`)}
            style={{ marginTop: "1rem" }}
          >
            Skip – view product
          </button>
        </section>
      )}
    </div>
  );
}
