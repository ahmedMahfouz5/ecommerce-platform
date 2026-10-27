import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAuthenticated, login, logout, type LoginCredentials } from "../api/client";

interface AuthState {
  /** Whether we have a stored token (does NOT validate expiry server-side). */
  isLoggedIn: boolean;
  /** True while a login/logout request is in flight. */
  loading: boolean;
  /** The most recent auth error message, or null. */
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: isAuthenticated(),
    loading: false,
    error: null,
  });

  // Listen for storage changes (e.g. token cleared in another tab)
  useEffect(() => {
    const handler = () => {
      setState((prev) => ({ ...prev, isLoggedIn: isAuthenticated() }));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await login(credentials);
      setState({ isLoggedIn: true, loading: false, error: null });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Login failed";
      setState({ isLoggedIn: false, loading: false, error: msg });
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await logout();
    } finally {
      setState({ isLoggedIn: false, loading: false, error: null });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login: handleLogin, logout: handleLogout, clearError }),
    [state, handleLogin, handleLogout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
