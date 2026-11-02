/**
 * Admin user-management API calls.
 */

import { apiDelete, apiGet, apiPatch } from "./client";

export interface User {
  id: string;
  username: string;
  email: string | null;
  is_admin: boolean;
  is_verified: boolean;
  verified_at: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface UserListResponse {
  users: User[];
}

export interface UserUpdatePayload {
  username?: string;
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
}

export async function listUsers(signal?: AbortSignal): Promise<User[]> {
  const data = await apiGet<UserListResponse>("/admin/users", signal);
  return data.users;
}

export async function updateUser(
  userId: string,
  payload: UserUpdatePayload,
): Promise<User> {
  return apiPatch<User>(`/admin/users/${userId}`, payload);
}

export async function deleteUser(userId: string): Promise<void> {
  return apiDelete(`/admin/users/${userId}`);
}
