import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchProduct, updateProduct, deleteProduct } from "../api/products";
import { ProductForm } from "../components/ProductForm";
import { ImageUploader } from "../components/ImageUploader";
import type { ProductUpdate } from "../types/product";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Trash2,
} from "lucide-react";

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

  // Loading
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

  // Error (no product)
  if (error && !product) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-20"
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Admin
        </Button>
      </div>
    );
  }

  // Not found
  if (!product) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-20">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Admin
        </Button>
      </div>
    );
  }

  const firstImage = product.image_download_url?.[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="space-y-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Admin
        </Button>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Edit: {product.title}
        </h2>
      </div>

      {/* Messages */}
      {successMsg && (
        <div
          className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div
          className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Image section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <ImageIcon className="mr-2 inline h-5 w-5" />
            Product Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {firstImage ? (
            <div className="max-w-xs overflow-hidden rounded-lg border border-border">
              <img
                src={firstImage}
                alt={product.title}
                className="w-full object-cover"
              />
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No image set.</p>
          )}
          {productId && (
            <ImageUploader
              productId={productId}
              onUploaded={handleImageUploaded}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            onSubmit={handleUpdate}
            submitting={updating}
            submitLabel="Update Product"
            initial={{
              title: product.title,
              description: product.description,
              price: product.price,
              amount: product.amount,
              categories: product.categories,
              rating: product.rating,
              shop_category: product.shop_category,
              unit_of_measure: product.unit_of_measure,
              oldPrice: product.oldPrice,
            }}
          />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Product"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

