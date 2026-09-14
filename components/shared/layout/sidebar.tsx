"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, navItems } from "@/components/shared/layout/nav-items";
import { BranchSwitcher } from "@/components/shared/layout/branch-switcher";
import { AppNotificationCenter } from "@/components/shared/layout/app-notification-center";
import { UserAccountMenu } from "@/components/shared/layout/user-account-menu";
import { useAuth } from "@/context/auth-context";
import { isNavVisibleForRole } from "@/lib/auth/nav-visibility";
import { uiAccent, uiAccentBg, uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  const visibleNavItems = navItems.filter((item) =>
    session ? isNavVisibleForRole(session.role, item.href) : false
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-[var(--sidebar-width,180px)] lg:shrink-0 lg:flex-col",
        uiSurface.sidebar
      )}
    >
      <div className="flex h-full flex-col px-3 py-5">
        <div className="mb-6 px-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-white">Sonic OS</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Operating System
              </p>
            </div>
            <AppNotificationCenter />
          </div>
        </div>

        <BranchSwitcher className="mb-5 px-1" />

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {visibleNavItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "sonic-nav-active text-white"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
                    isActive
                      ? cn(uiAccentBg[item.accent], uiAccent[item.accent])
                      : cn(
                          "bg-white/[0.03] ring-white/[0.06] text-zinc-500",
                          "group-hover:text-zinc-300"
                        )
                  )}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-white/[0.06] pt-4 px-1">
          <UserAccountMenu />
        </div>
      </div>
    </aside>
  );
}
