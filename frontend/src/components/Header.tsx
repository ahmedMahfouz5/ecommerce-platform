import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Menu,
  X,
  Package,
  UserPlus,
  LayoutDashboard,
  Users,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { LoginLogoutButton } from "./LoginLogoutButton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { CATEGORIES, type Category } from "../data/categories";

export function Header() {
  const { isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/products?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/products");
    }
  };

  const handleCategoryClick = (category: Category) => {
    setMobileMenuOpen(false);
    navigate(`/products?category=${encodeURIComponent(category.slug)}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6">
        {/* Top row: logo, search, actions */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground no-underline transition-opacity hover:opacity-85"
          >
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span className="font-brand hidden sm:inline">Ahmed Mahfouz</span>
          </Link>

          {/* Search bar - desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative mx-4 hidden max-w-md flex-1 sm:block"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search products"
            />
          </form>

          {/* Desktop actions */}
          <nav className="hidden items-center gap-1 sm:flex sm:gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <Package className="mr-1.5 h-4 w-4" />
                Products
              </Link>
            </Button>

            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}

            {!isLoggedIn && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/register">
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Register
                </Link>
              </Button>
            )}

            <Button variant="ghost" size="sm" asChild className="relative">
              <Link to="/cart">
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                Cart
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  0
                </span>
              </Link>
            </Button>

            <LoginLogoutButton />
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent sm:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Category menu - desktop */}
        <div className="mt-3 hidden items-center gap-1 border-t border-border pt-2 sm:flex">
          {CATEGORIES.map((category) => (
            <Button
              key={category.slug}
              variant="ghost"
              size="sm"
              onClick={() => handleCategoryClick(category)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search products"
              />
            </form>

            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.slug}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategoryClick(category)}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Package className="mr-1.5 h-4 w-4" />
                  Products
                </Link>
              </Button>

              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/admin/users"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="mr-1.5 h-4 w-4" />
                    Users
                  </Link>
                </Button>
              )}

              {!isLoggedIn && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Register
                  </Link>
                </Button>
              )}

              <Button variant="ghost" size="sm" asChild>
                <Link to="/cart" onClick={() => setMobileMenuOpen(false)}>
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  Cart
                </Link>
              </Button>

              <LoginLogoutButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
