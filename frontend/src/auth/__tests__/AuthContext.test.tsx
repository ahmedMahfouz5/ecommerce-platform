import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/test-utils";
import { useAuth, AuthProvider } from "../AuthContext";

// Dummy component that exercises the auth context
function AuthConsumer() {
  const { isLoggedIn, loading, error, login, logout, clearError } = useAuth();

  return (
    <div>
      <span data-testid="logged-in">{String(isLoggedIn)}</span>
      <span data-testid="loading">{String(loading)}</span>
      {error && <span data-testid="error">{error}</span>}
      <button
        data-testid="login-btn"
        onClick={() => login({ username: "admin", password: "pass" })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button data-testid="clear-btn" onClick={clearError}>
        Clear
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("starts as not logged in when no token", () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId("logged-in").textContent).toBe("false");
  });

  it("starts as logged in when token exists in sessionStorage", () => {
    sessionStorage.setItem("access_token", "test-token");
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId("logged-in").textContent).toBe("true");
  });

  it("login sets the token and updates state on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            access_token: "new-token",
            token_type: "bearer",
          }),
      }),
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId("login-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("logged-in").textContent).toBe("true");
      expect(sessionStorage.getItem("access_token")).toBe("new-token");
    });
  });

  it("login sets error state on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: "Invalid credentials" }),
      }),
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId("login-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe("Invalid credentials");
      expect(screen.getByTestId("logged-in").textContent).toBe("false");
    });
  });

  it("logout clears token", async () => {
    sessionStorage.setItem("access_token", "test-token");
    // Logout tries to POST, but fails gracefully
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId("logout-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("logged-in").textContent).toBe("false");
      expect(sessionStorage.getItem("access_token")).toBeNull();
    });
  });
});
