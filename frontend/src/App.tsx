import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { AnnouncementBar } from "./components/AnnouncementBar";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AdminRegisterPage } from "./pages/AdminRegisterPage";
import { AdminPage } from "./pages/AdminPage";
import { UsersDashboardPage } from "./pages/UsersDashboardPage";
import { ProductEditPage } from "./pages/ProductEditPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ResendVerificationPage } from "./pages/ResendVerificationPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePageRoute />} />
          <Route path="/products" element={<ProductListRoute />} />
          <Route path="/products/:productId" element={<ProductDetailRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

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
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <UsersDashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

function HomePageRoute() {
  return <HomePage />;
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
