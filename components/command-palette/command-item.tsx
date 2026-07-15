import { cn } from "@/lib/utils";
import type { ResolvedCommand } from "@/lib/commands";

interface CommandItemProps {
  command: ResolvedCommand;
  isSelected: boolean;
  onSelect: (command: ResolvedCommand) => void;
  onHover: () => void;
}

export function CommandItem({
  command,
  isSelected,
  onSelect,
  onHover,
}: CommandItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(command)}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150",
        isSelected
          ? "bg-white text-black"
          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
      )}
    >
      <span className="font-medium">{command.label}</span>
      {command.detail ? (
        <span
          className={cn(
            "shrink-0 text-xs",
            isSelected ? "text-zinc-600" : "text-zinc-500"
          )}
        >
          {command.detail}
        </span>
      ) : null}
    </button>
  );
}
