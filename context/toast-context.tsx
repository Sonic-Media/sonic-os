"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { id, message, variant }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message) => push(message, "info"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 lg:bottom-8"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              toast.variant === "success"
                ? "animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-emerald-500/20 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-emerald-300 shadow-xl shadow-black/40 backdrop-blur-md duration-300"
                : toast.variant === "error"
                  ? "animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-red-500/20 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-red-300 shadow-xl shadow-black/40 backdrop-blur-md duration-300"
                  : "animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-zinc-700/80 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-zinc-200 shadow-xl shadow-black/40 backdrop-blur-md duration-300"
            }
          >
            {toast.variant === "success" ? "✓ " : null}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
