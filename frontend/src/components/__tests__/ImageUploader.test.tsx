import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test/test-utils";
import { ImageUploader } from "../ImageUploader";

// We need to mock the fetch calls and XMLHttpRequest for s3Upload
describe("ImageUploader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the choose-image button in idle state", () => {
    render(<ImageUploader productId="abc" onUploaded={vi.fn()} />);
    expect(screen.getByText("Choose Image")).toBeInTheDocument();
  });

  it("shows validating state when a file is selected", async () => {
    // We need the validation to pass, then it moves to "requesting-url"
    // We mock the upload URL request to succeed after the file selection
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            upload_url: "https://s3.example.com/put",
            object_key: "products/abc/file.jpg",
            content_type: "image/jpeg",
            expires_in_seconds: 300,
          }),
      }),
    );

    render(<ImageUploader productId="abc" onUploaded={vi.fn()} />);

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Should move to "requesting-url" then "uploading" since fetch resolves
      expect(screen.getByText(/Preparing upload/)).toBeInTheDocument();
    });
  });

  it("shows error for unsupported file type", async () => {
    render(<ImageUploader productId="abc" onUploaded={vi.fn()} />);

    const file = new File(["dummy"], "test.gif", { type: "image/gif" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported/)).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: "Server error" }),
      }),
    );

    render(<ImageUploader productId="abc" onUploaded={vi.fn()} />);

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("has a try-again button after error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    render(<ImageUploader productId="abc" onUploaded={vi.fn()} />);

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try Again"));
    // Should go back to idle
    expect(screen.getByText("Choose Image")).toBeInTheDocument();
  });
});
