export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock_quantity: number;
  category: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProductCreate {
  name: string;
  description?: string | null;
  price: number;
  stock_quantity?: number;
  category: string;
  image_url?: string | null;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  price?: number;
  stock_quantity?: number;
  category?: string;
  image_url?: string | null;
}
