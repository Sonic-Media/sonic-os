import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
}

export function Select({
  label,
  hint,
  placeholder = "Select",
  options,
  className,
  id,
  value,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-zinc-400"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          className={cn(
            "w-full h-12 px-4 pr-10 rounded-xl bg-zinc-900/80 border border-zinc-800",
            "text-white text-base appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600",
            "transition-all duration-200",
            !value && "text-zinc-500",
            className
          )}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-500">
          ▼
        </span>
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
