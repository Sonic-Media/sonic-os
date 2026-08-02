"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface StockQuickActionProps {
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "primary";
  onClick?: () => void;
  href?: string;
}

function StockQuickAction({
  label,
  icon,
  variant = "default",
  onClick,
  href,
}: StockQuickActionProps) {
  const className = cn(
    "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.98]",
    variant === "primary"
      ? "border-white/20 bg-white text-black shadow-lg shadow-white/10 hover:bg-zinc-100"
      : "border-zinc-800/80 bg-zinc-900/60 text-white hover:bg-zinc-900/80 hover:border-zinc-700"
  );

  const content = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          variant === "primary" ? "bg-black/5" : "bg-white/5"
        )}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-center leading-tight">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

function AddProductIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function StockInIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function StockOutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 7.5L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function ViewProductsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

interface StockQuickActionsProps {
  onAddProduct?: () => void;
  onStockIn?: () => void;
  onStockOut?: () => void;
}

export function StockQuickActions({
  onAddProduct,
  onStockIn,
  onStockOut,
}: StockQuickActionsProps) {
  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StockQuickAction
          label="Add Product"
          variant="primary"
          icon={<AddProductIcon />}
          onClick={onAddProduct}
        />
        <StockQuickAction
          label="Stock In"
          icon={<StockInIcon />}
          onClick={onStockIn}
        />
        <StockQuickAction
          label="Stock Out"
          icon={<StockOutIcon />}
          onClick={onStockOut}
        />
        <StockQuickAction
          label="View Products"
          icon={<ViewProductsIcon />}
          href="/stock/products"
        />
      </div>
    </section>
  );
}
