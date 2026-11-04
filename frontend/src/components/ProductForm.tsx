import { useState, type FormEvent } from "react";
import type { ProductCreate } from "../types/product";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Save } from "lucide-react";

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
  title: "",
  description: "",
  price: 0,
  categories: [],
  image: [],
  rating: 1,
  amount: 0,
  shop_category: "",
  unit_of_measure: "",
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

  const set = (field: keyof ProductCreate, value: string | number | string[] | null) => {
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

  const parseNumber = (value: string): number =>
    value === "" ? 0 : Number(value);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!form.shop_category.trim())
      errors.shop_category = "Shop category is required.";
    if (!form.unit_of_measure.trim())
      errors.unit_of_measure = "Unit of measure is required.";
    if (form.price <= 0) errors.price = "Price must be greater than 0.";
    if (form.amount < 0) errors.amount = "Stock amount cannot be negative.";
    if (form.rating < 1 || form.rating > 5)
      errors.rating = "Rating must be between 1 and 5.";
    if (form.categories.length === 0 || !form.categories[0]?.trim()) {
      errors.categories = "At least one category is required.";
    }
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const rounded: ProductCreate = {
      ...form,
      price: Math.round(form.price * 100) / 100,
      oldPrice:
        form.oldPrice != null && form.oldPrice > 0
          ? Math.round(form.oldPrice * 100) / 100
          : null,
    };
    await onSubmit(rounded);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-xl flex-col gap-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-title">Title *</Label>
        <Input
          id="pf-title"
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
          maxLength={255}
        />
        {validation.title && (
          <p className="text-sm text-destructive" role="alert">
            {validation.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-desc">Description</Label>
        <Textarea
          id="pf-desc"
          value={form.description ?? ""}
          onChange={(e) =>
            set("description", e.target.value || null)
          }
          rows={3}
        />
      </div>

      {/* Price + Amount row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pf-price">Price *</Label>
          <Input
            id="pf-price"
            type="number"
            step="0.01"
            min="0.01"
            value={form.price || ""}
            onChange={(e) => set("price", parseNumber(e.target.value))}
            required
          />
          {validation.price && (
            <p className="text-sm text-destructive" role="alert">
              {validation.price}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-amount">Stock Amount</Label>
          <Input
            id="pf-amount"
            type="number"
            min="0"
            value={form.amount}
            onChange={(e) => set("amount", parseInt(e.target.value, 10) || 0)}
          />
          {validation.amount && (
            <p className="text-sm text-destructive" role="alert">
              {validation.amount}
            </p>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-categories">Categories *</Label>
        <Input
          id="pf-categories"
          type="text"
          value={form.categories.join(", ")}
          onChange={(e) =>
            set(
              "categories",
              e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
            )
          }
          required
          placeholder="e.g. fruits, apples"
        />
        {validation.categories && (
          <p className="text-sm text-destructive" role="alert">
            {validation.categories}
          </p>
        )}
      </div>

      {/* Shop category + Unit of measure row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pf-shop-category">Shop Category *</Label>
          <Input
            id="pf-shop-category"
            type="text"
            value={form.shop_category}
            onChange={(e) => set("shop_category", e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. grocery"
          />
          {validation.shop_category && (
            <p className="text-sm text-destructive" role="alert">
              {validation.shop_category}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-uom">Unit of Measure *</Label>
          <Input
            id="pf-uom"
            type="text"
            value={form.unit_of_measure}
            onChange={(e) => set("unit_of_measure", e.target.value)}
            required
            maxLength={50}
            placeholder="e.g. kg"
          />
          {validation.unit_of_measure && (
            <p className="text-sm text-destructive" role="alert">
              {validation.unit_of_measure}
            </p>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-rating">Rating *</Label>
        <Input
          id="pf-rating"
          type="number"
          min="1"
          max="5"
          step="1"
          value={form.rating}
          onChange={(e) =>
            set("rating", Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 1)))
          }
          required
        />
        {validation.rating && (
          <p className="text-sm text-destructive" role="alert">
            {validation.rating}
          </p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="self-start">
        <Save className="mr-2 h-4 w-4" />
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

