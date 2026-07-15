import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "flex-shrink-0 h-10 px-5 rounded-xl text-sm font-medium transition-all duration-200",
            value === option.id
              ? "bg-white text-black"
              : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
