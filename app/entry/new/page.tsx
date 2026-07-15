"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewEntryForm } from "@/components/entry/new-entry-form";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { findDraftForBranchDate, parseBranch } from "@/lib/entry-helpers";
import { getTodayISO } from "@/lib/dates";
import { useEntriesContext } from "@/context/entries-context";

function NewEntryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branch = parseBranch(searchParams.get("branch"));
  const { entries, isLoaded } = useEntriesContext();

  const draft = useMemo(() => {
    if (!isLoaded) return undefined;
    return findDraftForBranchDate(entries, branch, getTodayISO());
  }, [entries, branch, isLoaded]);

  useEffect(() => {
    if (draft) {
      router.replace(`/entry/${draft.id}/edit`);
    }
  }, [draft, router]);

  if (!isLoaded || draft) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="New Entry"
        subtitle="Record daily sales and expenses"
      />
      <NewEntryForm branch={branch} />
    </PageContainer>
  );
}

export default function NewEntryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewEntryPageContent />
    </Suspense>
  );
}
