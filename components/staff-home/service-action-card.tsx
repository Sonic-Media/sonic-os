"use client";

import Image from "next/image";
import {
  STAFF_SERVICE_ACCENT_STYLES,
  resolveServiceVisual,
  type StaffServiceDefinition,
} from "@/lib/staff-home/services";
import { StaffServiceIcon } from "@/lib/staff-home/icons";
import { cn } from "@/lib/utils";

interface ServiceActionCardProps {
  service: StaffServiceDefinition;
  onClick?: () => void;
  disabled?: boolean;
}

export function ServiceActionCard({
  service,
  onClick,
  disabled = false,
}: ServiceActionCardProps) {
  const accent = STAFF_SERVICE_ACCENT_STYLES[service.accent];
  const visual = resolveServiceVisual(service);
  const isDisabled = disabled || !service.enabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08]",
        "bg-gradient-to-br from-[rgba(18,20,34,0.95)] to-[rgba(10,12,22,0.9)]",
        "px-4 py-4 text-left transition-all duration-200 ease-out sm:px-5 sm:py-5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
        accent.borderHover,
        accent.glow,
        "hover:-translate-y-0.5 active:translate-y-0",
        isDisabled && "pointer-events-none opacity-45"
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 sm:h-16 sm:w-16",
          accent.iconBg,
          accent.text
        )}
      >
        {visual.mode === "image" && visual.imageSrc ? (
          <Image
            src={visual.imageSrc}
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            unoptimized
          />
        ) : (
          <StaffServiceIcon name={visual.iconKey} className="h-7 w-7 sm:h-8 sm:w-8" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold tracking-tight text-white sm:text-lg">
          {service.name}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500">
          {service.description}
        </p>
      </div>

      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-colors",
          "group-hover:border-white/15 group-hover:text-white"
        )}
        aria-hidden
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}
