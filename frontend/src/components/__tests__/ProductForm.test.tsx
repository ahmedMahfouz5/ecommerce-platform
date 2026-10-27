import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/test-utils";
import { ProductForm } from "../ProductForm";

describe("ProductForm", () => {
  it("renders all fields", () => {
    render(<ProductForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Price *")).toBeInTheDocument();
    expect(screen.getByLabelText("Stock")).toBeInTheDocument();
    expect(screen.getByLabelText("Category *")).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("Create Product"));

    await waitFor(() => {
      expect(screen.getByText("Name is required.")).toBeInTheDocument();
      expect(screen.getByText("Category is required.")).toBeInTheDocument();
      expect(screen.getByText("Price must be greater than 0.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with valid data", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Name *"), {
      target: { value: "New Product" },
    });
    fireEvent.change(screen.getByLabelText("Price *"), {
      target: { value: "19.99" },
    });
    fireEvent.change(screen.getByLabelText("Category *"), {
      target: { value: "books" },
    });
    fireEvent.change(screen.getByLabelText("Stock"), {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByText("Create Product"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const data = onSubmit.mock.calls[0][0];
    expect(data.name).toBe("New Product");
    expect(data.price).toBe(19.99);
    expect(data.category).toBe("books");
    expect(data.stock_quantity).toBe(5);
  });

  it("disables submit button when submitting", () => {
    render(<ProductForm onSubmit={vi.fn()} submitting />);
    expect(screen.getByText("Saving...")).toBeDisabled();
  });

  it("uses custom submit label", () => {
    render(<ProductForm onSubmit={vi.fn()} submitLabel="Update Product" />);
    expect(screen.getByText("Update Product")).toBeInTheDocument();
  });

  it("pre-populates initial values", () => {
    render(
      <ProductForm
        onSubmit={vi.fn()}
        initial={{ name: "Existing", category: "cat", price: 5.0 }}
      />,
    );
    expect(screen.getByLabelText("Name *")).toHaveValue("Existing");
    expect(screen.getByLabelText("Category *")).toHaveValue("cat");
  });
});
