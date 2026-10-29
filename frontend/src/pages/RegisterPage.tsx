import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { registerCustomer, type RegisterPayload } from "../api/auth";

export function RegisterPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: RegisterPayload = { username, email, password };
      if (fullName.trim()) payload.full_name = fullName.trim();

      const data = await registerCustomer(payload);

      // Auto-login: persist token from registration response
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("is_admin", String(!!data.is_admin));

      // Force a full page reload so AuthProvider picks up the new token
      window.location.href = "/";
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Registration failed";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Create Account</h2>

        {error && (
          <div className="auth-form__error" role="alert">
            {error}
          </div>
        )}

        <label htmlFor="reg-username">Username</label>
        <input
          id="reg-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          disabled={loading}
        />

        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />

        <label htmlFor="reg-fullname">Full Name (optional)</label>
        <input
          id="reg-fullname"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          disabled={loading}
        />

        <label htmlFor="reg-password">Password</label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
        />

        <button type="submit" disabled={loading || !username || !email || !password}>
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="auth-form__footer">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

