import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ProductForm } from "../components/ProductForm";
import { ImageUploader } from "../components/ImageUploader";
import type { ProductCreate } from "../types/product";
import { createProduct } from "../api/products";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LogOut, ShieldPlus, AlertCircle, CheckCircle2, SkipForward, Plus, Users } from "lucide-react";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage products and administrators.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/admin/register">
              <ShieldPlus className="mr-1.5 h-4 w-4" />
              Register Admin
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/admin/users">
              <Users className="mr-1.5 h-4 w-4" />
              Users Dashboard
            </Link>
          </Button>
          {isLoggedIn && (
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
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

      {!newProductId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <Plus className="mr-2 inline h-5 w-5" />
              Create New Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm onSubmit={handleCreate} submitting={submitting} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Product Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Product created — add an image now or skip.
            </p>
            <ImageUploader
              productId={newProductId}
              onUploaded={handleImageUploaded}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/products/${newProductId}`)}
            >
              <SkipForward className="mr-1.5 h-4 w-4" />
              Skip – view product
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
