import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test/test-utils";
import ProductCard from "../ProductCard";
import type { Product } from "../../types/product";

const product: Product = {
  id: "abc-123",
  title: "Test Widget",
  description: "A useful widget",
  price: 29.99,
  categories: ["electronics"],
  image: [],
  rating: 4,
  amount: 15,
  shop_category: "grocery",
  unit_of_measure: "pc(s)",
  oldPrice: null,
  sizes: null,
  colors: null,
  authors: null,
  image_download_url: null,
  on_sale: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
};

describe("ProductCard", () => {
  it("renders product title, price, and category", () => {
    render(<ProductCard product={product} onSelect={vi.fn()} />);

    expect(screen.getByText("Test Widget")).toBeInTheDocument();
    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("electronics")).toBeInTheDocument();
  });

  it("shows stock amount", () => {
    render(<ProductCard product={product} onSelect={vi.fn()} />);
    expect(screen.getByText("15 in stock")).toBeInTheDocument();
  });

  it('shows "Out of stock" when amount is 0', () => {
    render(
      <ProductCard
        product={{ ...product, amount: 0 }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("shows placeholder when no image", () => {
    render(<ProductCard product={product} onSelect={vi.fn()} />);
    expect(screen.getByText("No Image")).toBeInTheDocument();
  });

  it("renders image when image_download_url is set", () => {
    render(
      <ProductCard
        product={{ ...product, image_download_url: ["https://example.com/img.jpg"] }}
        onSelect={vi.fn()}
      />,
    );
    const img = screen.getByAltText("Test Widget");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("calls onSelect with product id on click", () => {
    const onSelect = vi.fn();
    render(<ProductCard product={product} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("abc-123");
  });

  it("calls onSelect on Enter key", () => {
    const onSelect = vi.fn();
    render(<ProductCard product={product} onSelect={onSelect} />);

    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("abc-123");
  });
});
