import { Card } from "@/components/shared/ui/card";
import type { OwnerStaffWorkingToday } from "@/lib/owner-command-center/calculations";

interface OwnerStaffWorkingTodayProps {
  staff: OwnerStaffWorkingToday[];
  getBranchName: (code: string) => string;
}

export function OwnerStaffWorkingTodayList({
  staff,
  getBranchName,
}: OwnerStaffWorkingTodayProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Staff Working Today
      </h2>
      <Card>
        {staff.length === 0 ? (
          <p className="text-sm text-zinc-500">No staff activity recorded today.</p>
        ) : (
          <ul className="space-y-2">
            {staff.map((member) => (
              <li
                key={`${member.name}-${member.branch}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium text-white">{member.name}</span>
                <span className="text-zinc-400">{getBranchName(member.branch)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
