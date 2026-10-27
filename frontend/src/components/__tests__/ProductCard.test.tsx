import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test/test-utils";
import ProductCard from "../ProductCard";
import type { Product } from "../../types/product";

const product: Product = {
  id: "abc-123",
  name: "Test Widget",
  description: "A useful widget",
  price: 29.99,
  stock_quantity: 15,
  category: "electronics",
  image_url: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
};

describe("ProductCard", () => {
  it("renders product name, price, and category", () => {
    render(<ProductCard product={product} onSelect={vi.fn()} />);

    expect(screen.getByText("Test Widget")).toBeInTheDocument();
    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("electronics")).toBeInTheDocument();
  });

  it("shows stock quantity", () => {
    render(<ProductCard product={product} onSelect={vi.fn()} />);
    expect(screen.getByText("15 in stock")).toBeInTheDocument();
  });

  it('shows "Out of stock" when stock is 0', () => {
    render(
      <ProductCard
        product={{ ...product, stock_quantity: 0 }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("shows placeholder when no image_url", () => {
    render(<ProductCard product={product} onSelect={vi.fn()} />);
    expect(screen.getByText("No Image")).toBeInTheDocument();
  });

  it("renders image when image_url is set", () => {
    render(
      <ProductCard
        product={{ ...product, image_url: "https://example.com/img.jpg" }}
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
