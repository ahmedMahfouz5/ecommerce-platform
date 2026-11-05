import { Truck, RotateCcw, ShieldCheck, Clock } from "lucide-react";

interface AnnouncementBarProps {
  message?: string;
}

export function AnnouncementBar({
  message = "Free shipping on orders over $50 | Express delivery available",
}: AnnouncementBarProps) {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 text-[13px] font-semibold sm:px-6">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          <span className="hidden sm:inline">{message}</span>
          <span className="sm:hidden">Free shipping over $50</span>
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          <div className="flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            <span>Easy Returns</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
