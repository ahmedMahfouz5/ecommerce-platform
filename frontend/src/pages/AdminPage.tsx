import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProductForm } from "../components/ProductForm";
import type { ProductCreate } from "../types/product";
import { createProduct } from "../api/products";

export function AdminPage() {
  const { logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (data: ProductCreate) => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const created = await createProduct(data);
      setSuccessMsg(`Product "${created.name}" created successfully.`);
      navigate(`/products/${created.id}`);
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

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2>Admin Dashboard</h2>
        <div className="admin-page__actions">
          <button
            className="admin-page__nav-btn"
            onClick={() => navigate("/admin/products/new")}
          >
            + New Product
          </button>
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

      <section className="admin-page__create">
        <h3>Create New Product</h3>
        <ProductForm onSubmit={handleCreate} submitting={submitting} />
      </section>
    </div>
  );
}
