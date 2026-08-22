"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isNavItemActive, navItems } from "@/components/shared/layout/nav-items";
import { BranchSwitcher } from "@/components/shared/layout/branch-switcher";
import { AppNotificationCenter } from "@/components/shared/layout/app-notification-center";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { isNavVisibleForRole } from "@/lib/auth/nav-visibility";
import { isCashierRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, lock, logout } = useAuth();
  const { staff } = useStaff();

  const linkedStaff = session
    ? staff.find((member) => member.userId === session.userId)
    : undefined;

  const visibleNavItems = navItems.filter((item) =>
    session ? isNavVisibleForRole(session.role, item.href) : false
  );

  function handleLock() {
    lock();
    router.push("/lock");
  }

  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-zinc-800/80 lg:bg-black">
      <div className="flex h-full flex-col px-5 py-8">
        <div className="mb-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">Sonic OS</p>
            <p className="mt-1 text-xs text-zinc-500">Business operating system</p>
            {session && (
              <p className="mt-3 text-xs text-zinc-400">
                {session.displayName}
              </p>
            )}
          </div>
          <AppNotificationCenter />
        </div>

        <BranchSwitcher className="mb-6" />

        <nav className="flex flex-1 flex-col gap-1">
          {visibleNavItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    isActive ? "bg-white/10" : "bg-white/5"
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {session && (
          <div className="mt-6 space-y-2 border-t border-zinc-800/80 pt-4">
            {linkedStaff && !isCashierRole(session.role) && (
              <Link
                href={`/staff/${linkedStaff.id}`}
                className="block rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
              >
                Profile
              </Link>
            )}
            {session.role === "owner" && (
              <Link
                href="/settings/users"
                className="block rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
              >
                Users
              </Link>
            )}
            {!isCashierRole(session.role) && (
              <button
                type="button"
                onClick={handleLock}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
              >
                Lock
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
