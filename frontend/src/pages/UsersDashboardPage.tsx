import { useEffect, useState } from "react";
import { listUsers, updateUser, deleteUser, type User } from "../api/users";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function UsersDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers(signal);
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal);
    return () => controller.abort();
  }, []);

  const handleToggle = async (
    user: User,
    field: "is_admin" | "is_active" | "is_verified",
  ) => {
    setUpdatingId(user.id);
    setSuccess(null);
    setError(null);
    try {
      const updated = await updateUser(user.id, {
        [field]: !user[field],
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
      setSuccess(`Updated ${updated.username}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(user.id);
    setSuccess(null);
    setError(null);
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccess(`Deleted ${user.username}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Users Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            View, edit, and manage platform users.
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Username</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Admin</th>
                    <th className="py-2 pr-4 font-medium">Active</th>
                    <th className="py-2 pr-4 font-medium">Verified</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{user.username}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {user.email ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Button
                          variant={user.is_admin ? "default" : "outline"}
                          size="sm"
                          disabled={updatingId === user.id}
                          onClick={() => handleToggle(user, "is_admin")}
                        >
                          {user.is_admin ? (
                            <>
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Yes
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-4 w-4" /> No
                            </>
                          )}
                        </Button>
                      </td>
                      <td className="py-3 pr-4">
                        <Button
                          variant={user.is_active ? "default" : "outline"}
                          size="sm"
                          disabled={updatingId === user.id}
                          onClick={() => handleToggle(user, "is_active")}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Button>
                      </td>
                      <td className="py-3 pr-4">
                        <Button
                          variant={user.is_verified ? "default" : "outline"}
                          size="sm"
                          disabled={updatingId === user.id}
                          onClick={() => handleToggle(user, "is_verified")}
                        >
                          {user.is_verified ? "Verified" : "Unverified"}
                        </Button>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === user.id}
                          onClick={() => handleDelete(user)}
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-4 w-4" /> Delete
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
