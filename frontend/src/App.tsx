import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { ShoppingCart, Package, UserPlus } from "lucide-react";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AdminRegisterPage } from "./pages/AdminRegisterPage";
import { AdminPage } from "./pages/AdminPage";
import { ProductEditPage } from "./pages/ProductEditPage";
import { LoginLogoutButton } from "./components/LoginLogoutButton";
import { Button } from "./components/ui/button";

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground no-underline transition-opacity hover:opacity-85"
          >
            <ShoppingCart className="h-6 w-6" />
            <span>E-Commerce</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <Package className="mr-1.5 h-4 w-4" />
                Products
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">Admin</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/register">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Register
              </Link>
            </Button>
            <LoginLogoutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Routes>
          {/* Public */}
          <Route path="/" element={<ProductListRoute />} />
          <Route path="/products/:productId" element={<ProductDetailRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin (authenticated + admin role) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/register"
            element={
              <ProtectedRoute requireAdmin>
                <AdminRegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/:productId"
            element={
              <ProtectedRoute requireAdmin>
                <ProductEditPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function ProductListRoute() {
  const navigate = useNavigate();
  return <ProductList onSelectProduct={(id) => navigate(`/products/${id}`)} />;
}

function ProductDetailRoute() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();

  return (
    <ProductDetail
      key={productId}
      productId={productId!}
      onBack={() => navigate(-1)}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
