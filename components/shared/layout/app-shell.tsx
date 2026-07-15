"use client";

import { BottomNav } from "@/components/shared/layout/bottom-nav";
import { Sidebar } from "@/components/shared/layout/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-full flex-1">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
