"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBranch } from "@/context/branch-context";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export function BranchSwitcher({ className }: { className?: string }) {
  const { session } = useAuth();
  const {
    activeBranch,
    setActiveBranch,
    isLoaded,
    activeBranches,
    getBranchName,
    canSwitchBranch,
  } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canSwitch = canSwitchBranch;

  const currentName = useMemo(
    () => getBranchName(activeBranch),
    [activeBranch, getBranchName]
  );

  useEffect(() => {
    if (!canSwitch) {
      setIsOpen(false);
    }
  }, [canSwitch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isLoaded || activeBranches.length === 0) {
    return null;
  }

  if (!canSwitch) {
    return (
      <div className={cn("rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5", className)}>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Branch
        </p>
        <p className="truncate text-sm font-medium text-white">{currentName}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-left transition-colors hover:border-zinc-600"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Branch
          </p>
          <p className="truncate text-sm font-medium text-white">
            {currentName}
          </p>
        </div>
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-xl">
          <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Switch branch
          </div>
          {activeBranches.map((branch) => {
            const isActive = branch.code === activeBranch;

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => {
                  void setActiveBranch(branch.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-300 hover:bg-zinc-900/80 hover:text-white"
                )}
              >
                <span>{branch.name}</span>
                {isActive ? (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-400">
                    Active
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
