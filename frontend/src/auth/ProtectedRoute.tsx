import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When true, also requires admin role. Default false. */
  requireAdmin?: boolean;
}

/**
 * Wraps children; redirects unauthenticated users to /login.
 * When `requireAdmin` is true, also checks for an admin role claim from sessionStorage.
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Not an admin — redirect to login (or could go to a "forbidden" page)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
