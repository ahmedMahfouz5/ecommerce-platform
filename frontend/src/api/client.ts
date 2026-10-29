/**
 * Centralized HTTP client for the e-commerce backend API.
 *
 * - All requests go through this module so auth headers, error handling,
 *   and base URLs are applied consistently.
 * - In development, Vite proxies /api → the backend; in production, nginx
 *   serves the SPA and proxies /api to the backend Service. The relative
 *   base URL works for both scenarios.
 */

const API_BASE = "/api/v1";

/** Standard JSON request headers. */
const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * Return auth headers for requests that require authentication.
 * Returns an empty object when no token is stored (backward-compatible
 * with endpoints that do not yet require authentication).
 */
function authHeaders(): Record<string, string> {
  try {
    const token = sessionStorage.getItem("access_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // sessionStorage may be unavailable in some test environments
  }
  return {};
}

// -------------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------------

export interface ApiError {
  status: number;
  detail: string;
}

/**
 * Thin wrapper around fetch that:
 *  - builds the full URL from the API base
 *  - merges JSON and auth headers
 *  - parses JSON error bodies
 *  - throws a typed ApiError on non-2xx responses
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    signal,
    headers: {
      ...JSON_HEADERS,
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail: string =
      typeof body?.detail === "string"
        ? body.detail
        : `Request failed with status ${res.status}`;

    const error: ApiError = { status: res.status, detail };
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// Convenience methods

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  return apiRequest<T>(path, { method: "GET" }, signal);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return apiRequest<T>(
    path,
    { method: "POST", body: JSON.stringify(body) },
    signal,
  );
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return apiRequest<T>(
    path,
    { method: "PUT", body: JSON.stringify(body) },
    signal,
  );
}

export async function apiDelete(
  path: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest<void>(path, { method: "DELETE" }, signal);
}

/**
 * Upload a file directly to an S3 presigned URL via HTTP PUT.
 * Does NOT use the JSON API client because the request goes to S3 directly.
 */
export async function s3Upload(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `S3 upload failed with status ${xhr.status}: ${xhr.statusText}`,
          ),
        );
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error during S3 upload.")),
    );
    xhr.addEventListener("abort", () =>
      reject(new DOMException("Upload aborted", "AbortError")),
    );

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

/**
 * Credentials accepted by the login endpoint.
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Token response from the backend.
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/**
 * Send login credentials and persist the returned access token.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<TokenResponse> {
  const data = await apiPost<TokenResponse>("/auth/login", credentials);
  sessionStorage.setItem("access_token", data.access_token);
  return data;
}

/**
 * Remove stored credentials.
 */
export async function logout(): Promise<void> {
  try {
    await apiPost("/auth/logout", {});
  } catch {
    // Best-effort — still clear local state
  }
  sessionStorage.removeItem("access_token");
}

/**
 * Return true when a token exists. Does not validate expiry.
 */
export function isAuthenticated(): boolean {
  try {
    return sessionStorage.getItem("access_token") !== null;
  } catch {
    return false;
  }
}
