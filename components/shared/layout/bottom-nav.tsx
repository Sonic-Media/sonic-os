"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, navItems } from "@/components/shared/layout/nav-items";
import { useAuth } from "@/context/auth-context";
import { canAccessRoute } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();

  const visibleNavItems = navItems.filter((item) =>
    session ? canAccessRoute(session.role, item.href) : false
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/80 bg-black/90 backdrop-blur-xl safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {visibleNavItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
                isActive
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  isActive && "bg-white/10"
                )}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
