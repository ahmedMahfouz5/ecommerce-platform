import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

/**
 * Conditional auth button for the app header:
 * - Not logged in  → "Sign In" button
 * - Logged in      → "Sign Out" button
 */
export function LoginLogoutButton() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <Button
        size="sm"
        onClick={() => navigate("/login")}
      >
        <LogIn className="mr-1.5 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => logout()}
      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut className="mr-1.5 h-4 w-4" />
      Sign Out
    </Button>
  );
}
