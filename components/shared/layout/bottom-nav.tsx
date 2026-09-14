"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, navItems } from "@/components/shared/layout/nav-items";
import { useAuth } from "@/context/auth-context";
import { isNavVisibleForRole } from "@/lib/auth/nav-visibility";
import { uiAccent, uiAccentBg } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();

  const visibleNavItems = navItems.filter((item) =>
    session ? isNavVisibleForRole(session.role, item.href) : false
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[rgba(8,10,18,0.92)] backdrop-blur-xl safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1.5">
        {visibleNavItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors",
                  isActive
                    ? cn(uiAccentBg[item.accent], uiAccent[item.accent])
                    : "bg-white/[0.03] ring-white/[0.06]"
                )}
              >
                {item.icon}
              </span>
              <span className="max-w-[64px] truncate text-[9px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
