import Link from "next/link";
import { cn } from "@/lib/utils";

interface StockProductBreadcrumbsProps {
  productName: string;
  className?: string;
}

export function StockProductBreadcrumbs({
  productName,
  className,
}: StockProductBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("mb-4 flex flex-wrap items-center gap-2 text-sm", className)}
    >
      <Link
        href="/stock"
        className="text-zinc-500 transition-colors hover:text-white"
      >
        Stock
      </Link>
      <span className="text-zinc-600" aria-hidden>
        &gt;
      </span>
      <Link
        href="/stock/products"
        className="text-zinc-500 transition-colors hover:text-white"
      >
        Items
      </Link>
      <span className="text-zinc-600" aria-hidden>
        &gt;
      </span>
      <span className="font-medium text-white">{productName}</span>
    </nav>
  );
}
