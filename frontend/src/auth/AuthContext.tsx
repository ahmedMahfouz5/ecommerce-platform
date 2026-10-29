import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginUser, type LoginResponse } from "../api/auth";

interface AuthState {
  /** Whether we have a stored token (does NOT validate expiry server-side). */
  isLoggedIn: boolean;
  /** Whether the current user is an admin (from login response). */
  isAdmin: boolean;
  /** True while a login/logout request is in flight. */
  loading: boolean;
  /** The most recent auth error message, or null. */
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  try {
    return sessionStorage.getItem("access_token");
  } catch {
    return null;
  }
}

function readIsAdmin(): boolean {
  try {
    return sessionStorage.getItem("is_admin") === "true";
  } catch {
    return false;
  }
}

function persistAuth(token: string, isAdmin: boolean) {
  sessionStorage.setItem("access_token", token);
  sessionStorage.setItem("is_admin", String(isAdmin));
}

function clearPersistedAuth() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("is_admin");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: readToken() !== null,
    isAdmin: readIsAdmin(),
    loading: false,
    error: null,
  });

  // Listen for storage changes (e.g. token cleared in another tab)
  useEffect(() => {
    const handler = () => {
      setState((prev) => ({
        ...prev,
        isLoggedIn: readToken() !== null,
        isAdmin: readIsAdmin(),
      }));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data: LoginResponse = await loginUser(username, password);
      const isAdmin = !!data.is_admin;
      persistAuth(data.access_token, isAdmin);
      setState({ isLoggedIn: true, isAdmin, loading: false, error: null });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Login failed";
      setState({ isLoggedIn: false, isAdmin: false, loading: false, error: msg });
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearPersistedAuth();
    setState({ isLoggedIn: false, isAdmin: false, loading: false, error: null });
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
