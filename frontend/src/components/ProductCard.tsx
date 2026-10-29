import type { Product } from "../types/product";

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <article
      className="product-card"
      onClick={() => onSelect(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(product.id);
        }
      }}
      aria-label={`View details for ${product.name}`}
    >
      <div className="product-card__image">
        {product.image_download_url ? (
          <img src={product.image_download_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card__image-placeholder" aria-hidden="true">
            No Image
          </div>
        )}
      </div>
      <div className="product-card__body">
        <span className="product-card__category">{product.category}</span>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        <p className="product-card__stock">
          {product.stock_quantity > 0
            ? `${product.stock_quantity} in stock`
            : "Out of stock"}
        </p>
      </div>
    </article>
  );
}

export default ProductCard;

