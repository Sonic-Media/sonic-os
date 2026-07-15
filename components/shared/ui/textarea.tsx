import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-400"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "w-full min-h-[96px] px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800",
          "text-white text-base placeholder:text-zinc-600 resize-none",
          "focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600",
          "transition-all duration-200",
          className
        )}
        {...props}
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
