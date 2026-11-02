/**
 * Auth-related API calls — register, admin-register, login, verify-email,
 * resend-verification, forgot-password, reset-password.
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

export interface UserResponse {
  id: string;
  username: string;
  email: string | null;
  is_admin: boolean;
  is_verified: boolean;
  verified_at: string | null;
}

export interface RegisterResponse {
  message: string;
  user: UserResponse;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  is_admin?: boolean;
  expires_in?: number;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResendVerificationPayload {
  email: string;
}

// -------------------------------------------------------------------------
// API calls
// -------------------------------------------------------------------------

/**
 * Register a new customer account.
 * Backend sends a verification email; no token is returned.
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

/**
 * Verify a user's email address using a token from a link.
 */
export async function verifyEmail(payload: VerifyEmailPayload): Promise<void> {
  return apiPost<void>("/auth/verify-email", payload);
}

/**
 * Request a new verification email for an unverified account.
 */
export async function resendVerification(
  payload: ResendVerificationPayload,
): Promise<void> {
  return apiPost<void>("/auth/resend-verification", payload);
}

/**
 * Request a password reset email.
 */
export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<void> {
  return apiPost<void>("/auth/forgot-password", payload);
}

/**
 * Reset a user's password using a token from a reset link.
 */
export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  return apiPost<void>("/auth/reset-password", payload);
}
