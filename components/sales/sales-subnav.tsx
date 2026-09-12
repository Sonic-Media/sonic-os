"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getVisibleSalesNavItems } from "@/lib/auth/sales-nav-visibility";
import { cn } from "@/lib/utils";

export function SalesSubnav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const navItems = session ? getVisibleSalesNavItems(session.role) : [];

  return (
    <nav className="mb-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-xl px-4 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/15 text-white ring-1 ring-blue-500/30"
                  : "border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200"
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
