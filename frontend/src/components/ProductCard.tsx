import type { Product } from "../types/product";
import { cn } from "@/lib/utils";

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  const firstImage = product.image_download_url?.[0] ?? null;
  const firstCategory = product.categories[0] ?? product.shop_category;

  return (
    <article
      onClick={() => onSelect(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(product.id);
        }
      }}
      aria-label={`View details for ${product.title}`}
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {firstImage ? (
          <img
            src={firstImage}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <span className="inline-block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {firstCategory}
        </span>
        <h3 className="text-base font-semibold leading-tight text-foreground">
          {product.title}
        </h3>
        <p className="text-lg font-bold text-green-600 dark:text-green-400">
          {formatPrice(product.price)}
        </p>
        {product.on_sale && product.oldPrice != null && (
          <p className="text-sm text-muted-foreground line-through">
            {formatPrice(product.oldPrice)}
          </p>
        )}
        <p
          className={cn(
            "text-sm font-medium",
            product.amount > 0
              ? "text-muted-foreground"
              : "text-destructive"
          )}
        >
          {product.amount > 0
            ? `${product.amount} in stock`
            : "Out of stock"}
        </p>
      </div>
    </article>
  );
}

export default ProductCard;
