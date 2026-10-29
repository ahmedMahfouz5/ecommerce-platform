import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  requestUploadUrl,
  confirmUpload,
  validateImageFile,
  MAX_UPLOAD_SIZE_BYTES,
} from "../images";

describe("validateImageFile", () => {

  it("returns null for valid JPEG", () => {
    // File constructor doesn't let us set size, so test via a mock
    const file = { type: "image/jpeg", size: 1024 } as File;
    expect(validateImageFile(file)).toBeNull();
  });

  it("returns error for unsupported type", () => {
    const file = { type: "image/gif", size: 1024 } as File;
    expect(validateImageFile(file)).toContain("Unsupported");
  });

  it("returns error for empty file", () => {
    const file = { type: "image/jpeg", size: 0 } as File;
    expect(validateImageFile(file)).toContain("empty");
  });

  it("returns error for oversized file", () => {
    const file = { type: "image/png", size: MAX_UPLOAD_SIZE_BYTES + 1 } as File;
    expect(validateImageFile(file)).toContain("too large");
  });
});

describe("requestUploadUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the correct endpoint", async () => {
    const mockResponse = {
      upload_url: "https://s3.example.com/put",
      object_key: "products/abc/file.jpg",
      content_type: "image/jpeg",
      expires_in_seconds: 300,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    const result = await requestUploadUrl("abc", "image/jpeg", 1024);
    expect(result.upload_url).toBe(mockResponse.upload_url);
    expect(result.object_key).toBe(mockResponse.object_key);
  });

  it("throws on validation error from backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ detail: "Unsupported image format" }),
      }),
    );

    await expect(requestUploadUrl("abc", "image/gif", 100)).rejects.toMatchObject({
      status: 422,
    });
  });
});

describe("confirmUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the confirm endpoint with object_key", async () => {
    const mockResponse = {
      product_id: "abc",
      object_key: "products/abc/file.jpg",
      updated_at: "2025-01-01T00:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    const result = await confirmUpload("abc", "products/abc/file.jpg");
    expect(result.object_key).toBe("products/abc/file.jpg");
  });
});
