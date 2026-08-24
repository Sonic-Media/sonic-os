import { cn } from "@/lib/utils";
import { uiSurface, uiTypography } from "@/lib/ui/design-tokens";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={inputId} className={uiTypography.label}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          uiSurface.input,
          error && "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
