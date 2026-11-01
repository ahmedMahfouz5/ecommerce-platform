import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { registerAdmin, type RegisterPayload } from "../api/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { ShieldPlus, AlertCircle, CheckCircle2, ArrowLeft, ShieldAlert } from "lucide-react";

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
      <div className="flex justify-center pt-8 sm:pt-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only existing admins can create new admin accounts.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </CardFooter>
        </Card>
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
    <div className="flex justify-center pt-8 sm:pt-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register New Admin</CardTitle>
          <CardDescription>
            Create a new admin account. Requires an existing admin session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {success && (
              <div
                className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
                role="status"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Admin account created successfully.</span>
              </div>
            )}

            {error && (
              <div
                className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="admin-reg-username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="admin-reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-reg-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="admin-reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-reg-fullname" className="text-sm font-medium">
                Full Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="admin-reg-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-reg-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="admin-reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username || !email || !password}
            >
              <ShieldPlus className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Create Admin"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Admin Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
