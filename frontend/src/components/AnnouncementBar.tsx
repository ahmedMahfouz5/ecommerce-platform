import { Truck, RotateCcw, ShieldCheck, Clock } from "lucide-react";

interface AnnouncementBarProps {
  message?: string;
}

export function AnnouncementBar({
  message = "Free shipping on orders over $50 | Express delivery available",
}: AnnouncementBarProps) {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs font-medium sm:px-6 sm:text-sm">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          <span className="hidden sm:inline">{message}</span>
          <span className="sm:hidden">Free shipping over $50</span>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Easy Returns</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
