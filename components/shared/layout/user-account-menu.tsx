"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { isCashierRole, USER_ROLE_LABELS } from "@/lib/auth/permissions";
import { getUserInitials } from "@/lib/ui/user-avatar";
import { cn } from "@/lib/utils";

interface UserAccountMenuProps {
  className?: string;
  compact?: boolean;
}

export function UserAccountMenu({ className, compact = false }: UserAccountMenuProps) {
  const router = useRouter();
  const { session, lock, logout } = useAuth();
  const { staff } = useStaff();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const linkedStaff = session
    ? session.staffId
      ? staff.find((member) => member.id === session.staffId)
      : staff.find((member) => member.userId === session.userId)
    : undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session) return null;

  const initials = getUserInitials(session.displayName);
  const roleLabel = USER_ROLE_LABELS[session.role] ?? session.role;

  function handleLock() {
    lock();
    router.push("/lock");
    setIsOpen(false);
  }

  function handleLogout() {
    logout();
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-left transition-colors hover:border-white/[0.1] hover:bg-white/[0.05]",
          compact && "p-2"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-xs font-semibold text-white ring-1 ring-white/10">
          {initials}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">
              {session.displayName}
            </span>
            <span className="block truncate text-[11px] text-zinc-500">{roleLabel}</span>
          </span>
        )}
        {!compact && (
          <svg
            className={cn(
              "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
              isOpen && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(8,10,18,0.98)] shadow-xl shadow-black/50 backdrop-blur-xl"
        >
          {linkedStaff && !isCashierRole(session.role) ? (
            <Link
              href={`/staff/${linkedStaff.id}`}
              role="menuitem"
              className="block px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Profile
            </Link>
          ) : null}
          {session.role === "owner" ? (
            <Link
              href="/settings/users"
              role="menuitem"
              className="block px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Users
            </Link>
          ) : null}
          {!isCashierRole(session.role) ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleLock}
              className="block w-full px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Lock
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full border-t border-white/[0.06] px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  );
}
