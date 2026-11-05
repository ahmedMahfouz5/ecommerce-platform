import type { Product } from "../types/product";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

function discountPercent(price: number, oldPrice: number | null | undefined): number | null {
  if (oldPrice && oldPrice > price) {
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  }
  return null;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  const firstImage = product.image_download_url?.[0] ?? null;
  const firstCategory = product.categories[0] ?? product.shop_category;
  const discount = discountPercent(product.price, product.oldPrice);

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
        {discount && (
          <span className="absolute left-2 top-2 rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground shadow-sm">
            -{discount}%
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <span className="inline-block text-[13px] font-semibold uppercase tracking-widest text-foreground/80">
          {firstCategory}
        </span>
        <h3 className="text-[15px] font-semibold leading-snug text-foreground">
          {product.title}
        </h3>
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-lg font-extrabold text-green-700 dark:text-green-400">
            {formatPrice(product.price)}
          </p>
          {product.on_sale && product.oldPrice != null && (
            <>
              <p className="text-[13px] text-foreground/70 line-through">
                {formatPrice(product.oldPrice)}
              </p>
              {discount && (
                <span className="text-[13px] font-semibold text-destructive">
                  Save {formatPrice(product.oldPrice - product.price)}
                </span>
              )}
            </>
          )}
        </div>
        <p
          className={cn(
            "text-[13px] font-medium",
            product.amount > 0
              ? "text-foreground/80"
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
