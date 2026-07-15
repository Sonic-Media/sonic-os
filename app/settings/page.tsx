"use client";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { SettingsContent } from "@/components/settings/settings-content";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Manage your Sonic OS preferences"
      />
      <SettingsContent />
    </PageContainer>
  );
}
