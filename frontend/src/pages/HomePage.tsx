import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";
import { fetchProducts } from "../api/products";
import type { Product } from "../types/product";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { CATEGORIES } from "../data/categories";

const HERO_SLIDES = [
  {
    id: 1,
    title: "Everything You Need, Delivered",
    subtitle:
      "Fresh groceries, stylish clothing, the latest tech, and more — all in one place.",
    image: "/offersImages/offer1.png",
    cta: "Start Shopping",
    link: "/products",
  },
  {
    id: 2,
    title: "Upgrade Your Tech",
    subtitle: "Laptops, smartphones, and gadgets at unbeatable prices.",
    image: "/offersImages/offer2.png",
    cta: "Shop Electronics",
    link: "/products?category=electronics",
  },
  {
    id: 3,
    title: "Comfort Meets Style",
    subtitle: "New furniture and clothing arrivals for every season.",
    image: "/offersImages/offer3.png",
    cta: "Shop Now",
    link: "/products?category=furniture",
  },
];

function SectionHeader({
  title,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between sm:mb-6">
      <h2 className="flex items-center gap-2 text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px]">
        {Icon && <Icon className="h-6 w-6 text-primary" />}
        {title}
      </h2>
      {actionLabel && (
        <Button variant="ghost" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function CountdownTimer({ targetHours = 6 }: { targetHours?: number }) {
  const [timeLeft, setTimeLeft] = useState(targetHours * 3600);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive">
      <Timer className="mr-1 h-4 w-4" />
      <span>Ends in:</span>
      <span className="tabular-nums">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
  const prev = () =>
    setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
      <div
        className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {HERO_SLIDES.map((slide) => (
          <div
            key={slide.id}
            className="flex w-full flex-shrink-0 flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:px-12 sm:py-16 lg:px-16"
          >
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold uppercase tracking-widest text-primary">
                Limited Offer
              </span>
              <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                {slide.subtitle}
              </p>
              <Button size="lg" onClick={() => navigate(slide.link)}>
                {slide.cta}
              </Button>
            </div>
            <div className="flex flex-1 justify-center">
              <img
                src={slide.image}
                alt={slide.title}
                className="max-h-[220px] rounded-xl object-contain drop-shadow-xl sm:max-h-[300px] lg:max-h-[360px]"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={prev}
        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition hover:bg-background sm:left-4 sm:h-10 sm:w-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition hover:bg-background sm:right-4 sm:h-10 sm:w-10"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              idx === current
                ? "w-6 bg-primary"
                : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedCategories({ onSelect }: { onSelect: (slug: string) => void }) {
  return (
    <section className="py-8">
      <SectionHeader
        title="Featured Categories"
        icon={Sparkles}
        actionLabel="View all"
        onAction={() => onSelect("")}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-3 flex h-16 items-center justify-center sm:h-20">
              <img
                src={cat.image}
                alt={cat.name}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <p className="text-center text-sm font-semibold text-foreground">
              {cat.name}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProductSection({
  title,
  icon: Icon,
  products,
  onSelect,
}: {
  title: string;
  icon?: React.ElementType;
  products: Product[];
  onSelect: (id: string) => void;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-8">
      <SectionHeader title={title} icon={Icon} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function DealsSection({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (id: string) => void;
}) {
  if (products.length === 0) return null;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-destructive/10 to-destructive/5 py-8">
      <div className="px-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <Flame className="h-5 w-5 text-destructive" />
            Hot Deals
          </h2>
          <CountdownTimer targetHours={6} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function useHomeData() {
  const [loading, setLoading] = useState(true);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const loadHomeData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const response = await fetchProducts(
        1,
        50,
        undefined,
        undefined,
        controller.signal
      );
      const all = response.items;

      // On-sale items first, sorted by biggest discount
      const saleItems = all
        .filter((p) => p.on_sale && p.oldPrice != null && p.oldPrice > p.price)
        .sort((a, b) => {
          const aDiscount = (a.oldPrice! - a.price) / a.oldPrice!;
          const bDiscount = (b.oldPrice! - b.price) / b.oldPrice!;
          return bDiscount - aDiscount;
        });

      // Best sellers = highest rated, excluding items already in deals
      const dealIds = new Set(saleItems.map((p) => p.id));
      const bestSellersList = all
        .filter((p) => !dealIds.has(p.id))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4);

      // New arrivals = most recently created, excluding items in deals or best sellers
      const usedIds = new Set([...dealIds, ...bestSellersList.map((p) => p.id)]);
      const newArrivalsList = all
        .filter((p) => !usedIds.has(p.id))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 4);

      setDeals(saleItems.slice(0, 4));
      setBestSellers(bestSellersList);
      setNewArrivals(newArrivalsList);
    } catch {
      // ignore - sections will just be hidden if data fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
    return () => abortRef.current?.abort();
  }, [loadHomeData]);

  return { loading, bestSellers, newArrivals, deals };
}

export function HomePage() {
  const navigate = useNavigate();
  const { loading, bestSellers, newArrivals, deals } = useHomeData();

  const handleSelectProduct = (id: string) => navigate(`/products/${id}`);
  const handleCategorySelect = (slug: string) => {
    if (slug) {
      navigate(`/products?category=${encodeURIComponent(slug)}`);
    } else {
      navigate("/products");
    }
  };

  return (
    <div className="space-y-2">
      <HeroSlider />

      <FeaturedCategories onSelect={handleCategorySelect} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <DealsSection products={deals} onSelect={handleSelectProduct} />

          <ProductSection
            title="Best Sellers"
            icon={TrendingUp}
            products={bestSellers}
            onSelect={handleSelectProduct}
          />

          <ProductSection
            title="New Arrivals"
            icon={Sparkles}
            products={newArrivals}
            onSelect={handleSelectProduct}
          />

          <section className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-muted/50 px-6 py-8 sm:flex-row sm:px-12">
            <div>
              <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                Shop the Full Catalog
              </h3>
              <p className="mt-1 text-muted-foreground">
                Browse all products, filter by category, and find what you need.
              </p>
            </div>
            <Button size="lg" onClick={() => navigate("/products")}>
              Browse All Products
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
