"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StockBranchBar } from "@/components/stock/stock-branch-bar";
import { STOCK_NAV_ITEMS } from "@/lib/stock/constants";
import { cn } from "@/lib/utils";

export function StockSubnav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8">
      <StockBranchBar />
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STOCK_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-shrink-0 h-10 px-5 rounded-xl text-sm font-medium transition-all duration-200 inline-flex items-center",
                isActive
                  ? "bg-white text-black"
                  : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
