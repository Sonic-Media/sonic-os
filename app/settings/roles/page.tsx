"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RolesList } from "@/components/settings/roles-list";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { Card } from "@/components/shared/ui/card";
import { useAuth } from "@/context/auth-context";

export default function SettingsRolesPage() {
  const router = useRouter();
  const { isLoaded, canManageRoles } = useAuth();

  useEffect(() => {
    if (isLoaded && !canManageRoles) {
      router.replace("/settings");
    }
  }, [canManageRoles, isLoaded, router]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!canManageRoles) {
    return null;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        subtitle="Default staff roles and permissions"
      />

      <Card className="mb-6">
        <p className="text-sm text-zinc-400">
          Sonic OS ships with default role permissions. A full permission editor
          will be added here in a future update.
        </p>
      </Card>

      <RolesList />
    </PageContainer>
  );
}
