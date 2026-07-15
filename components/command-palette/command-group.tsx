import type { CommandGroup } from "@/lib/commands";
import { CommandItem } from "@/components/command-palette/command-item";
import type { ResolvedCommand } from "@/lib/commands";

interface CommandGroupProps {
  label: string;
  group: CommandGroup;
  commands: ResolvedCommand[];
  selectedIndex: number;
  getFlatIndex: (commandId: string) => number;
  onSelect: (command: ResolvedCommand) => void;
  onHover: (index: number) => void;
}

export function CommandGroupSection({
  label,
  commands,
  selectedIndex,
  getFlatIndex,
  onSelect,
  onHover,
}: CommandGroupProps) {
  return (
    <div>
      <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="space-y-0.5">
        {commands.map((command) => {
          const flatIndex = getFlatIndex(command.id);

          return (
            <CommandItem
              key={command.id}
              command={command}
              isSelected={flatIndex === selectedIndex}
              onSelect={onSelect}
              onHover={() => onHover(flatIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
