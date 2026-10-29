/**
 * Product-image upload API.
 *
 * Workflow:
 *  1. Client picks a file and calls requestUploadUrl with the MIME type and size.
 *  2. Backend validates the request and returns a presigned S3 PUT URL + object key.
 *  3. Client uploads the file *directly to S3* via the returned URL.
 *  4. Client calls confirmUpload with the object key to associate the image.
 *
 * At no point does the image file pass through the application backend,
 * and no AWS credentials are exposed to the browser.
 *
 * --- Image Viewing ---
 * The backend returns a presigned S3 download URL in the product's
 * `image_url` field.  No client-side URL construction is needed.
 */

import { apiPost, apiPut } from "./client";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

/** Request body for POST …/images/upload-url */
export interface ImageUploadUrlRequest {
  content_type: string;
  file_size_bytes: number;
}

/** Response from POST …/images/upload-url */
export interface ImageUploadUrlResponse {
  upload_url: string;
  object_key: string;
  content_type: string;
  expires_in_seconds: number;
}

/** Request body for PUT …/images/confirm */
export interface ImageConfirmationRequest {
  object_key: string;
}

/** Response from PUT …/images/confirm */
export interface ImageConfirmationResponse {
  product_id: string;
  object_key: string;
  content_type?: string | null;
  updated_at: string;
}

/** Allowed MIME types and their file extensions (must match backend). */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

/**
 * Validate a file client-side before requesting a presigned URL.
 * Returns a user-facing error string, or null if the file is valid.
 */
export function validateImageFile(file: File): string | null {
  if (!(file.type in ALLOWED_IMAGE_TYPES)) {
    return `Unsupported file type "${file.type}". Allowed: JPEG, PNG, WebP.`;
  }
  if (file.size < 1) {
    return "File is empty.";
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const maxMb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024);
    return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MiB). Maximum is ${maxMb} MiB.`;
  }
  return null;
}

/**
 * Request a presigned S3 upload URL for a product image.
 */
export async function requestUploadUrl(
  productId: string,
  contentType: string,
  fileSizeBytes: number,
  signal?: AbortSignal,
): Promise<ImageUploadUrlResponse> {
  return apiPost<ImageUploadUrlResponse>(
    `/products/${productId}/images/upload-url`,
    { content_type: contentType, file_size_bytes: fileSizeBytes },
    signal,
  );
}

/**
 * Confirm that an image upload completed and associate it with the product.
 */
export async function confirmUpload(
  productId: string,
  objectKey: string,
  signal?: AbortSignal,
): Promise<ImageConfirmationResponse> {
  return apiPut<ImageConfirmationResponse>(
    `/products/${productId}/images/confirm`,
    { object_key: objectKey },
    signal,
  );
}
