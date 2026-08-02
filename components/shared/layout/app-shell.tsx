"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { BranchSwitcher } from "@/components/shared/layout/branch-switcher";
import { Sidebar } from "@/components/shared/layout/sidebar";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useAuth } from "@/context/auth-context";
import {
  canAccessRoute,
  getDefaultRouteForRole,
} from "@/lib/auth/permissions";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isAuthenticated, isLocked, session } = useAuth();

  const isLoginPage = pathname === "/login";
  const isLockPage = pathname === "/lock";
  const isAuthPage = isLoginPage || isLockPage;

  useEffect(() => {
    if (!isLoaded) return;

    if (!isAuthenticated && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isLoginPage) {
      router.replace(getDefaultRouteForRole(session!.role));
      return;
    }

    if (isAuthenticated && isLocked && !isLockPage) {
      router.replace("/lock");
      return;
    }

    if (isAuthenticated && !isLocked && isLockPage) {
      router.replace(getDefaultRouteForRole(session!.role));
      return;
    }

    if (
      isAuthenticated &&
      !isLocked &&
      session &&
      !isAuthPage &&
      !canAccessRoute(session.role, pathname)
    ) {
      router.replace(getDefaultRouteForRole(session.role));
    }
  }, [
    isLoaded,
    isAuthenticated,
    isLocked,
    isLoginPage,
    isLockPage,
    isAuthPage,
    pathname,
    router,
    session,
  ]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-zinc-800/80 px-4 py-3 lg:hidden">
          <BranchSwitcher />
        </div>
        <main className="min-h-full flex-1">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
