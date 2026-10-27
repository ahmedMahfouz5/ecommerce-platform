import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { ProductEditPage } from "./pages/ProductEditPage";

function AppLayout() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <Link to="/" className="app__title-link">
            E-Commerce Platform
          </Link>
        </h1>
        <nav className="app__nav">
          <Link to="/" className="app__nav-link">
            Products
          </Link>
          <Link to="/admin" className="app__nav-link">
            Admin
          </Link>
        </nav>
      </header>

      <main className="app__main">
        <Routes>
          {/* Public */}
          <Route path="/" element={<ProductListRoute />} />
          <Route path="/products/:productId" element={<ProductDetailRoute />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin (authenticated) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
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
  // Derive productId from the path since ProductDetail still uses the prop pattern
  const pathParts = window.location.pathname.split("/");
  const productId = pathParts[pathParts.length - 1] ?? "";

  return (
    <ProductDetail
      key={productId}
      productId={productId}
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