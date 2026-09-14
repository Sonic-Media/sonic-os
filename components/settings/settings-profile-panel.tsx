"use client";

import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { useAuth } from "@/context/auth-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { USER_ROLE_LABELS } from "@/lib/auth/permissions";
import { getUserInitials } from "@/lib/ui/user-avatar";

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

export function SettingsProfilePanel() {
  const { session } = useAuth();
  const { getBranchName } = useSettings();
  const { staff } = useStaff();

  if (!session) {
    return (
      <SettingsPanelShell title="Profile" description="Sign in to view your profile.">
        <p className="text-sm text-zinc-500">No active session.</p>
      </SettingsPanelShell>
    );
  }

  const linkedStaff = session.staffId
    ? staff.find((member) => member.id === session.staffId)
    : staff.find((member) => member.userId === session.userId);

  const email = linkedStaff?.email?.trim() || "Not set";
  const roleLabel = USER_ROLE_LABELS[session.role] ?? session.role;
  const branchLabel = getBranchName(session.branch);
  const initials = getUserInitials(session.displayName);

  return (
    <SettingsPanelShell
      title="Profile"
      description="Your account details and branch assignment."
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-lg font-semibold text-white ring-1 ring-white/10">
          {initials}
        </span>
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <ProfileField label="Name" value={session.displayName} />
          <ProfileField label="Email" value={email} />
          <ProfileField label="Role" value={roleLabel} />
          <ProfileField label="Branch" value={branchLabel} />
        </div>
      </div>
    </SettingsPanelShell>
  );
}
