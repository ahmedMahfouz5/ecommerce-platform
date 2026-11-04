import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/test-utils";
import { ProductForm } from "../ProductForm";

describe("ProductForm", () => {
  it("renders all required fields", () => {
    render(<ProductForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Title *")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Price *")).toBeInTheDocument();
    expect(screen.getByLabelText("Stock Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Categories *")).toBeInTheDocument();
    expect(screen.getByLabelText("Shop Category *")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit of Measure *")).toBeInTheDocument();
    expect(screen.getByLabelText("Rating *")).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    const onSubmit = vi.fn();
    render(<ProductForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("Create Product"));

    await waitFor(() => {
      expect(screen.getByText("Title is required.")).toBeInTheDocument();
      expect(screen.getByText("At least one category is required.")).toBeInTheDocument();
      expect(screen.getByText("Price must be greater than 0.")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with valid data", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "New Product" },
    });
    fireEvent.change(screen.getByLabelText("Price *"), {
      target: { value: "19.99" },
    });
    fireEvent.change(screen.getByLabelText("Categories *"), {
      target: { value: "books, fiction" },
    });
    fireEvent.change(screen.getByLabelText("Shop Category *"), {
      target: { value: "grocery" },
    });
    fireEvent.change(screen.getByLabelText("Unit of Measure *"), {
      target: { value: "pc(s)" },
    });
    fireEvent.change(screen.getByLabelText("Stock Amount"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Rating *"), {
      target: { value: "4" },
    });

    fireEvent.click(screen.getByText("Create Product"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const data = onSubmit.mock.calls[0]?.[0];
    expect(data.title).toBe("New Product");
    expect(data.price).toBe(19.99);
    expect(data.categories).toEqual(["books", "fiction"]);
    expect(data.amount).toBe(5);
    expect(data.rating).toBe(4);
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
        initial={{ title: "Existing", categories: ["cat"], price: 5.0 }}
      />,
    );
    expect(screen.getByLabelText("Title *")).toHaveValue("Existing");
    expect(screen.getByLabelText("Categories *")).toHaveValue("cat");
  });
});
