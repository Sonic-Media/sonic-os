"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuditLogFilters } from "@/components/audit-log/audit-log-filters";
import { AuditLogTable } from "@/components/audit-log/audit-log-table";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useAuditLog } from "@/context/audit-log-context";
import { useAuth } from "@/context/auth-context";

export default function AuditLogPage() {
  const router = useRouter();
  const { canViewAuditLog } = useAuth();
  const { isLoaded, criteria, setCriteria, filteredRecords } = useAuditLog();

  useEffect(() => {
    if (isLoaded && !canViewAuditLog) {
      router.replace("/settings");
    }
  }, [canViewAuditLog, isLoaded, router]);

  if (!isLoaded || !canViewAuditLog) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of important actions across Sonic OS"
      />

      <AuditLogFilters criteria={criteria} onCriteriaChange={setCriteria} />

      <AuditLogTable records={filteredRecords} />
    </PageContainer>
  );
}
