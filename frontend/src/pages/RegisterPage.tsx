import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { registerCustomer, type RegisterPayload } from "../api/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

export function RegisterPage() {
  const { isLoggedIn } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const payload: RegisterPayload = { username, email, password };
      await registerCustomer(payload);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
            ? (err as { detail: string }).detail
            : "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center pt-8 sm:pt-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Sign up for a new account to get started.
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
                <span>
                  Registration successful! Please check your email to verify
                  your account before signing in.
                </span>
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
              <label htmlFor="reg-username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="reg-password"
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
              disabled={loading || !username || !email || !password || success}
            >
              {loading ? (
                "Creating account..."
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Didn't receive a verification email?{" "}
            <Link
              to="/resend-verification"
              className="font-medium text-primary hover:underline"
            >
              Resend it
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
