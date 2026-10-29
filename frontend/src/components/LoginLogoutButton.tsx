import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

/**
 * Conditional auth button for the app header:
 * - Not logged in  → "Sign In" button
 * - Logged in      → user badge + "Sign Out" button
 */
export function LoginLogoutButton() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <button className="header-auth-btn" onClick={() => navigate("/login")}>
        Sign In
      </button>
    );
  }

  return (
    <button className="header-auth-btn header-auth-btn--logout" onClick={() => logout()}>
      Sign Out
    </button>
  );
}
