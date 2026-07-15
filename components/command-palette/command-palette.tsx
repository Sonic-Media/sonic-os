"use client";

import { useEffect, useRef } from "react";
import { CommandGroupSection } from "@/components/command-palette/command-group";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const {
    isOpen,
    close,
    query,
    setQuery,
    filteredCommands,
    groupedCommands,
    selectedIndex,
    setSelectedIndex,
    executeCommand,
    handleKeyDown,
    getFlatIndex,
  } = useCommandPalette();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !inputRef.current) return;

    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current) return;

    const selected = listRef.current.querySelector('[aria-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-[command-palette-fade-in_200ms_ease-out]"
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/40",
          "animate-[command-palette-scale-in_220ms_cubic-bezier(0.16,1,0.3,1)]"
        )}
        onKeyDown={handleKeyDown}
      >
        <div className="border-b border-zinc-800/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 shrink-0 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, staff, branches, templates..."
              className="h-10 w-full bg-transparent text-base text-white placeholder:text-zinc-600 focus:outline-none"
              aria-label="Search pages, staff, branches, and actions"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-500 sm:inline-block">
              Esc
            </kbd>
          </div>
        </div>

        <div
          ref={listRef}
          role="listbox"
          className="max-h-[min(50vh,360px)] overflow-y-auto p-2"
        >
          {filteredCommands.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-500">
              No results found
            </p>
          ) : (
            <div className="space-y-3">
              {groupedCommands.map((group) => (
                <CommandGroupSection
                  key={group.group}
                  label={group.label}
                  group={group.group}
                  commands={group.commands}
                  selectedIndex={selectedIndex}
                  getFlatIndex={getFlatIndex}
                  onSelect={executeCommand}
                  onHover={setSelectedIndex}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
