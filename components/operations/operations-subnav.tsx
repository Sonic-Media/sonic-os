"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { canAccessCloseDay } from "@/lib/day-closing/permissions";
import { OPERATIONS_NAV_ITEMS } from "@/lib/operations/constants";
import { cn } from "@/lib/utils";

export function OperationsSubnav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const canCloseDay = session ? canAccessCloseDay(session.role) : false;

  const items = OPERATIONS_NAV_ITEMS.filter(
    (item) => !item.requiresCloseDayAccess || canCloseDay
  );

  return (
    <nav className="mb-8">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((item) => {
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
