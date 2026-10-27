import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When true, also requires admin role. Default false. */
  requireAdmin?: boolean;
}

/**
 * Wraps children; redirects unauthenticated users to /login.
 * When `requireAdmin` is true, also checks for an admin role claim.
 *
 * Currently permissive for admin — the backend doesn't enforce roles yet,
 * so we just check that a token exists. When the backend adds role claims,
 * decode the JWT here.
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    // Future: decode JWT and check role/permissions.
    // For now, any authenticated user is treated as an admin
    // because the backend doesn't have role-based enforcement yet.
  }

  return <>{children}</>;
}
