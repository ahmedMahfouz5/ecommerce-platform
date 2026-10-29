import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
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
          <Link to="/register" className="app__nav-link">
            Register
          </Link>
          <LoginLogoutButton />
        </nav>
      </header>

      <main className="app__main">
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
