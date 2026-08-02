"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HistoricalImportWorkspace } from "@/components/historical-import/historical-import-workspace";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useAuth } from "@/context/auth-context";

export default function HistoricalImportPage() {
  const router = useRouter();
  const { isLoaded, canImportHistoricalData } = useAuth();

  useEffect(() => {
    if (isLoaded && !canImportHistoricalData) {
      router.replace("/settings");
    }
  }, [canImportHistoricalData, isLoaded, router]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!canImportHistoricalData) {
    return null;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Historical Data Import"
        subtitle="Import historical daily operations records into Sonic OS"
      />
      <HistoricalImportWorkspace />
    </PageContainer>
  );
}
