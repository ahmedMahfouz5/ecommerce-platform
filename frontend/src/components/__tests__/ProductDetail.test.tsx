import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "../../test/test-utils";
import ProductDetail from "../ProductDetail";
import type { Product } from "../../types/product";

const mockProduct: Product = {
  id: "abc",
  name: "Detail Widget",
  description: "Full description",
  price: 49.99,
  stock_quantity: 10,
  category: "tools",
  image_url: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
};

describe("ProductDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<ProductDetail productId="abc" onBack={vi.fn()} />);
    expect(screen.getByText("Loading product...")).toBeInTheDocument();
  });

  it("renders product details after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProduct),
      }),
    );

    render(<ProductDetail productId="abc" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Detail Widget")).toBeInTheDocument();
    });
    expect(screen.getByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("Full description")).toBeInTheDocument();
    expect(screen.getByText("10 units in stock")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: "Boom" }),
      }),
    );

    render(<ProductDetail productId="abc" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });

  it("shows not-found when product is null after fetch", async () => {
    // Simulates a successful 200 but null response — unlikely in practice
    // but the component handles it defensively
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
      }),
    );

    render(<ProductDetail productId="abc" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Product not found.")).toBeInTheDocument();
    });
  });
});
