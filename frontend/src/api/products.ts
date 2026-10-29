import type { Product, ProductCreate, ProductListResponse, ProductUpdate } from "../types/product";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export async function fetchProducts(
  page = 1,
  pageSize = 20,
  category?: string,
  q?: string,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category) params.set("category", category);
  if (q && q.trim()) params.set("q", q.trim());

  return apiGet<ProductListResponse>(`/products?${params.toString()}`, signal);
}

export async function fetchProduct(
  id: string,
  signal?: AbortSignal,
): Promise<Product> {
  return apiGet<Product>(`/products/${id}`, signal);
}

export async function createProduct(
  data: ProductCreate,
  signal?: AbortSignal,
): Promise<Product> {
  return apiPost<Product>("/products", data, signal);
}

export async function updateProduct(
  id: string,
  data: ProductUpdate,
  signal?: AbortSignal,
): Promise<Product> {
  return apiPut<Product>(`/products/${id}`, data, signal);
}

export async function deleteProduct(
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiDelete(`/products/${id}`, signal);
}
