import { cn } from "@/lib/utils";
import { uiSurface, uiTypography } from "@/lib/ui/design-tokens";

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
  error?: string;
  placeholder?: string;
  options: SelectOption[];
}

export function Select({
  label,
  hint,
  error,
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
      {label ? (
        <label htmlFor={selectId} className={uiTypography.label}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          className={cn(
            uiSurface.input,
            "appearance-none pr-10",
            !value && "text-zinc-500",
            error && "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20",
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-zinc-500">
          ▼
        </span>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
