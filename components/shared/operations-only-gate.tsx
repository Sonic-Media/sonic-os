"use client";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { OwnerCard } from "@/components/dashboard/owner/primitives";

interface OperationsOnlyGateProps {
  title: string;
  description: string;
  actionLabel?: string;
}

export function OperationsOnlyGate({
  title,
  description,
  actionLabel = "Open Today's Operations",
}: OperationsOnlyGateProps) {
  return (
    <PageContainer>
      <OwnerCard className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Today&apos;s Operations Only
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
          {description}
        </p>
        <Link
          href="/operations/today"
          className="mt-8 inline-flex rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100"
        >
          {actionLabel}
        </Link>
      </OwnerCard>
    </PageContainer>
  );
}
