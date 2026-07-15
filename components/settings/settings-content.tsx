import { APP, BRANCHES, DEFAULT_EXPENSES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/shared/ui/card";

export function SettingsContent() {
  const branchNames = BRANCHES.map((b) => b.name).join(", ");
  const defaultLunch = DEFAULT_EXPENSES.find((e) => e.name === "Lunch")?.amount ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Business
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white">Business Name</span>
            <span className="text-zinc-400">{APP.businessName}</span>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="flex items-center justify-between">
            <span className="text-white">Branches</span>
            <span className="text-zinc-400">{branchNames}</span>
          </div>
          <div className="h-px bg-zinc-800" />
          <div className="flex items-center justify-between">
            <span className="text-white">Default Lunch</span>
            <span className="text-zinc-400">{formatCurrency(defaultLunch)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Account
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-white">Owner</span>
          <span className="text-zinc-400">{APP.ownerName}</span>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          About
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-white">Version</span>
          <span className="text-zinc-400">{APP.version}</span>
        </div>
      </Card>
    </div>
  );
}
