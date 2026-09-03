"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { ResetBusinessDataSection } from "@/components/settings/reset-business-data-section";
import { DataProtectionSection } from "@/components/settings/data-protection-section";
import { useAuth } from "@/context/auth-context";

export default function SettingsMaintenancePage() {
  const router = useRouter();
  const { isLoaded, canManageUsers } = useAuth();

  useEffect(() => {
    if (isLoaded && !canManageUsers) {
      router.replace("/settings");
    }
  }, [isLoaded, canManageUsers, router]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!canManageUsers) {
    return null;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Maintenance"
        subtitle="Owner-only tools for backups and controlled data resets"
      />
      <div className="space-y-4">
        <DataProtectionSection />
        <ResetBusinessDataSection />
      </div>
    </PageContainer>
  );
}
