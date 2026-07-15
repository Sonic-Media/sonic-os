import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
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
      <input
        id={inputId}
        className={cn(
          "w-full h-12 px-4 rounded-xl bg-zinc-900/80 border border-zinc-800",
          "text-white text-base placeholder:text-zinc-600",
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
