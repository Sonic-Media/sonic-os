import { cn } from "@/lib/utils";
import { uiSurface, uiTypography } from "@/lib/ui/design-tokens";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={textareaId} className={uiTypography.label}>
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        className={cn(
          "min-h-[100px] w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-base text-white placeholder:text-zinc-600 transition-all duration-200 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20",
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
