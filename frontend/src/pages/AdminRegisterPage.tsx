import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { registerAdmin, type RegisterPayload } from "../api/auth";

export function AdminRegisterPage() {
  const { isLoggedIn, isAdmin } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only authenticated admins can access this page
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: { pathname: "/admin/register" } }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="register-page">
        <div className="auth-form" style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Access Denied</h2>
          <p>Only existing admins can create new admin accounts.</p>
          <Link to="/" style={{ display: "inline-block", marginTop: "1rem", color: "#1a1a2e" }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const payload: RegisterPayload = { username, email, password };
      if (fullName.trim()) payload.full_name = fullName.trim();

      await registerAdmin(payload);
      setSuccess(true);
      setUsername("");
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Admin registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Register New Admin</h2>
        <p className="auth-form__subtitle">
          Create a new admin account. Requires an existing admin session.
        </p>

        {success && (
          <div className="auth-form__success" role="status">
            Admin account created successfully.
          </div>
        )}

        {error && (
          <div className="auth-form__error" role="alert">
            {error}
          </div>
        )}

        <label htmlFor="admin-reg-username">Username</label>
        <input
          id="admin-reg-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          disabled={loading}
        />

        <label htmlFor="admin-reg-email">Email</label>
        <input
          id="admin-reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />

        <label htmlFor="admin-reg-fullname">Full Name (optional)</label>
        <input
          id="admin-reg-fullname"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          disabled={loading}
        />

        <label htmlFor="admin-reg-password">Password</label>
        <input
          id="admin-reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
        />

        <button type="submit" disabled={loading || !username || !email || !password}>
          {loading ? "Creating..." : "Create Admin"}
        </button>

        <p className="auth-form__footer">
          <Link to="/admin">← Back to Admin Dashboard</Link>
        </p>
      </form>
    </div>
  );
}

