"use client";

import { SettingsAppearancePanel } from "@/components/settings/settings-appearance-panel";
import { SettingsBranchesPanel } from "@/components/settings/settings-branches-panel";
import { SettingsBusinessPanel } from "@/components/settings/settings-business-panel";
import { SettingsCategoriesPanel } from "@/components/settings/settings-categories-panel";
import { SettingsDataBackupPanel } from "@/components/settings/settings-data-backup-panel";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsNotificationsPanel } from "@/components/settings/settings-notifications-panel";
import { SettingsProfilePanel } from "@/components/settings/settings-profile-panel";
import { SettingsSecurityPanel } from "@/components/settings/settings-security-panel";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useSettingsPage } from "@/hooks/use-settings-page";
import type { SettingsSectionId } from "@/lib/settings/sections";

function SettingsPanel({ section }: { section: SettingsSectionId }) {
  switch (section) {
    case "profile":
      return <SettingsProfilePanel />;
    case "business":
      return <SettingsBusinessPanel />;
    case "branches":
      return <SettingsBranchesPanel />;
    case "categories":
      return <SettingsCategoriesPanel />;
    case "notifications":
      return <SettingsNotificationsPanel />;
    case "data-backup":
      return <SettingsDataBackupPanel />;
    case "appearance":
      return <SettingsAppearancePanel />;
    case "security":
      return <SettingsSecurityPanel />;
    default:
      return <SettingsProfilePanel />;
  }
}

export function SettingsWorkspace() {
  const {
    isLoaded,
    settingsLoadError,
    activeSection,
    setActiveSection,
    navItems,
    activeNavItem,
  } = useSettingsPage();

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Settings"
        subtitle="Manage your Sonic OS preferences"
      />

      {settingsLoadError ? (
        <p className="text-sm text-red-400">{settingsLoadError}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <SettingsNav
          items={navItems}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        <div className="min-w-0 space-y-2">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 lg:block">
            {activeNavItem.label}
          </p>
          <SettingsPanel section={activeSection} />
        </div>
      </div>
    </PageContainer>
  );
}
