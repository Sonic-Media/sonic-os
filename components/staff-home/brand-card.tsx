"use client";

import { cn } from "@/lib/utils";

interface BrandCardProps {
  className?: string;
  /** Optional replaceable brand image path under /public */
  imageSrc?: string;
}

export function BrandCard({ className, imageSrc }: BrandCardProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08]",
        "bg-gradient-to-br from-[#12152a] via-[#0c1020] to-[#070910]",
        "p-6 sm:p-8",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_minmax(140px,180px)] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300/90">
            Sonic Media
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Keep the shop moving.
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            Every sale, service and expense counts.
          </p>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Movies · Accessories · Services · Printing · Windows · More
          </p>
        </div>

        <div
          className={cn(
            "relative mx-auto flex h-28 w-full max-w-[180px] items-center justify-center overflow-hidden rounded-2xl",
            "border border-white/[0.08] bg-gradient-to-br from-sky-500/10 via-transparent to-violet-500/10"
          )}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold tracking-tight text-white">Sonic OS</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Business Made Simple
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
