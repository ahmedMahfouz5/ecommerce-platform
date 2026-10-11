import type { Product, ProductCreate, ProductListResponse, ProductUpdate } from "../types/product";

const BASE_URL = "/api/v1/products";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchProducts(
  page = 1,
  pageSize = 20,
  category?: string,
): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category) params.set("category", category);

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  return handleResponse<ProductListResponse>(res);
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${BASE_URL}/${id}`);
  return handleResponse<Product>(res);
}

export async function createProduct(data: ProductCreate): Promise<Product> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Product>(res);
}

export async function updateProduct(id: string, data: ProductUpdate): Promise<Product> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Product>(res);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  return handleResponse<void>(res);
}
