import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchProducts, fetchProduct, createProduct, updateProduct, deleteProduct } from "../products";

const BASE = "/api/v1/products";

describe("fetchProducts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the correct URL with default pagination", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }),
    });
    vi.stubGlobal("fetch", mock);

    await fetchProducts();

    expect(mock).toHaveBeenCalledTimes(1);
    const url = mock.mock.calls[0][0] as string;
    expect(url).toContain("/products?page=1&pageSize=20");
  });

  it("adds category filter when provided", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }),
    });
    vi.stubGlobal("fetch", mock);

    await fetchProducts(2, 10, "electronics");

    const url = mock.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
    expect(url).toContain("category=electronics");
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: "Server error" }),
      }),
    );

    await expect(fetchProducts()).rejects.toMatchObject({
      status: 500,
      detail: "Server error",
    });
  });

  it("passes AbortSignal through", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }),
    });
    vi.stubGlobal("fetch", mock);

    const ctrl = new AbortController();
    await fetchProducts(1, 20, undefined, ctrl.signal);

    expect(mock.mock.calls[0][1]?.signal).toBe(ctrl.signal);
  });
});

describe("fetchProduct", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the correct URL", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "abc", name: "Widget" }),
    });
    vi.stubGlobal("fetch", mock);

    await fetchProduct("abc");
    expect(mock.mock.calls[0][0]).toBe(`${BASE}/abc`);
  });

  it("throws on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: "Product not found" }),
      }),
    );

    await expect(fetchProduct("missing")).rejects.toMatchObject({
      status: 404,
      detail: "Product not found",
    });
  });
});

describe("createProduct", () => {
  it("sends POST with JSON body", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "new", name: "Created" }),
    });
    vi.stubGlobal("fetch", mock);

    await createProduct({
      name: "Test",
      price: 9.99,
      stock_quantity: 5,
      category: "books",
    });

    expect(mock.mock.calls[0][1]?.method).toBe("POST");
    const body = JSON.parse(mock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe("Test");
    expect(body.price).toBe(9.99);
  });
});

describe("updateProduct", () => {
  it("sends PUT with partial body", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "abc", name: "Updated" }),
    });
    vi.stubGlobal("fetch", mock);

    await updateProduct("abc", { name: "Updated" });

    expect(mock.mock.calls[0][1]?.method).toBe("PUT");
    const body = JSON.parse(mock.mock.calls[0][1]?.body as string);
    expect(body.name).toBe("Updated");
    expect(body.price).toBeUndefined();
  });
});

describe("deleteProduct", () => {
  it("sends DELETE", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
    });
    vi.stubGlobal("fetch", mock);

    await deleteProduct("abc");
    expect(mock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
