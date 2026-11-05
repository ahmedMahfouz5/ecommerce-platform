export interface Category {
  name: string;
  slug: string;
  image: string;
}

export const CATEGORIES: Category[] = [
  { name: "Grocery", slug: "grocery", image: "/shopCategories/fruites&vagetables.png" },
  { name: "Clothing", slug: "clothing", image: "/shopCategories/hoodies.jpg" },
  { name: "Books", slug: "books", image: "/icons/books.png" },
  { name: "Electronics", slug: "electronics", image: "/icons/laptop.png" },
  { name: "Furniture", slug: "furniture", image: "/shopCategories/furnitures.png" },
  { name: "Beauty", slug: "beauty", image: "/shopCategories/lipsticks.jpg" },
  { name: "Health", slug: "health", image: "/shopCategories/health.jpg" },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
