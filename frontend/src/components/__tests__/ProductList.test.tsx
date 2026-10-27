import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test/test-utils";
import ProductList from "../ProductList";
import type { ProductListResponse, Product } from "../../types/product";

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Alpha",
    description: "First product",
    price: 10.0,
    stock_quantity: 5,
    category: "cat-a",
    image_url: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Beta",
    description: null,
    price: 20.0,
    stock_quantity: 0,
    category: "cat-b",
    image_url: null,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
];

function mockFetchOk(data: ProductListResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchError(status: number, detail: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ detail }),
    }),
  );
}

describe("ProductList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state initially", () => {
    // Never resolve
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<ProductList onSelectProduct={vi.fn()} />);
    expect(screen.getByText("Loading products...")).toBeInTheDocument();
  });

  it("renders products after successful fetch", async () => {
    mockFetchOk({
      items: mockProducts,
      total: 2,
      page: 1,
      page_size: 12,
      total_pages: 1,
    });

    render(<ProductList onSelectProduct={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockFetchError(500, "Server error");

    render(<ProductList onSelectProduct={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows empty state when no products", async () => {
    mockFetchOk({
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
      total_pages: 1,
    });

    render(<ProductList onSelectProduct={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No products found.")).toBeInTheDocument();
    });
  });

  it("shows pagination when multiple pages", async () => {
    mockFetchOk({
      items: mockProducts,
      total: 30,
      page: 1,
      page_size: 12,
      total_pages: 3,
    });

    render(<ProductList onSelectProduct={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });
  });

  it("hides pagination when only one page", async () => {
    mockFetchOk({
      items: mockProducts,
      total: 2,
      page: 1,
      page_size: 12,
      total_pages: 1,
    });

    render(<ProductList onSelectProduct={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it("filters by search term client-side", async () => {
    mockFetchOk({
      items: mockProducts,
      total: 2,
      page: 1,
      page_size: 12,
      total_pages: 1,
    });

    render(<ProductList onSelectProduct={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText("Search products");
    fireEvent.change(searchInput, { target: { value: "beta" } });

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });

  it("calls onSelectProduct when a card is clicked", async () => {
    mockFetchOk({
      items: mockProducts,
      total: 2,
      page: 1,
      page_size: 12,
      total_pages: 1,
    });

    const onSelect = vi.fn();
    render(<ProductList onSelectProduct={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});
