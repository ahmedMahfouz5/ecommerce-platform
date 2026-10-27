import { useState, type FormEvent } from "react";
import type { ProductCreate, ProductUpdate } from "../types/product";

interface ProductFormProps {
  /** Called with form data on submit. */
  onSubmit: (data: ProductCreate) => Promise<void>;
  /** When true, disable the submit button. */
  submitting?: boolean;
  /** Pre-populate for editing. */
  initial?: Partial<ProductCreate>;
  /** Change the submit label (default: "Create Product"). */
  submitLabel?: string;
}

const EMPTY: ProductCreate = {
  name: "",
  description: "",
  price: 0,
  stock_quantity: 0,
  category: "",
  image_url: null,
};

export function ProductForm({
  onSubmit,
  submitting = false,
  initial,
  submitLabel = "Create Product",
}: ProductFormProps) {
  const [form, setForm] = useState<ProductCreate>({
    ...EMPTY,
    ...initial,
  });
  const [validation, setValidation] = useState<Record<string, string>>({});

  const set = (field: keyof ProductCreate, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field-level error on change
    if (validation[field]) {
      setValidation((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.category.trim()) errors.category = "Category is required.";
    if (form.price <= 0) errors.price = "Price must be greater than 0.";
    if (form.stock_quantity < 0)
      errors.stock_quantity = "Stock cannot be negative.";
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Round price to 2 decimal places
    const rounded: ProductCreate = {
      ...form,
      price: Math.round(form.price * 100) / 100,
    };
    await onSubmit(rounded);
  };

  return (
    <form className="product-form" onSubmit={handleSubmit} noValidate>
      <div className="product-form__field">
        <label htmlFor="pf-name">Name *</label>
        <input
          id="pf-name"
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          maxLength={255}
        />
        {validation.name && (
          <span className="product-form__error" role="alert">
            {validation.name}
          </span>
        )}
      </div>

      <div className="product-form__field">
        <label htmlFor="pf-desc">Description</label>
        <textarea
          id="pf-desc"
          value={form.description ?? ""}
          onChange={(e) =>
            set("description", e.target.value || null)
          }
          rows={3}
        />
      </div>

      <div className="product-form__row">
        <div className="product-form__field">
          <label htmlFor="pf-price">Price *</label>
          <input
            id="pf-price"
            type="number"
            step="0.01"
            min="0.01"
            value={form.price || ""}
            onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
            required
          />
          {validation.price && (
            <span className="product-form__error" role="alert">
              {validation.price}
            </span>
          )}
        </div>

        <div className="product-form__field">
          <label htmlFor="pf-stock">Stock</label>
          <input
            id="pf-stock"
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(e) =>
              set("stock_quantity", parseInt(e.target.value, 10) || 0)
            }
          />
          {validation.stock_quantity && (
            <span className="product-form__error" role="alert">
              {validation.stock_quantity}
            </span>
          )}
        </div>
      </div>

      <div className="product-form__field">
        <label htmlFor="pf-category">Category *</label>
        <input
          id="pf-category"
          type="text"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          required
          maxLength={100}
        />
        {validation.category && (
          <span className="product-form__error" role="alert">
            {validation.category}
          </span>
        )}
      </div>

      <button type="submit" disabled={submitting} className="product-form__submit">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
