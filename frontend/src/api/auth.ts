/**
 * Auth-related API calls — register, admin-register, login.
 */

import { apiPost } from "./client";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  is_admin?: boolean;
  expires_in?: number;
}

export interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_admin?: boolean;
  access_token: string;
  token_type: string;
}

// -------------------------------------------------------------------------
// API calls
// -------------------------------------------------------------------------

/**
 * Register a new customer account.
 * Returns user info + JWT. The token is NOT persisted here — the caller decides.
 */
export async function registerCustomer(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/auth/register", payload);
}

/**
 * Register a new admin account. Requires an existing admin token.
 */
export async function registerAdmin(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/auth/admin/register", payload);
}

/**
 * Login with username/password. Returns JWT + is_admin flag.
 */
export async function loginUser(
  username: string,
  password: string,
): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", { username, password });
}
