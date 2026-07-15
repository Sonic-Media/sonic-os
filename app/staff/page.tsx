import { STAFF_MEMBERS } from "@/lib/constants";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Card } from "@/components/shared/ui/card";

export default function StaffPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        subtitle="Team members across both branches"
      />

      <div className="space-y-3">
        {STAFF_MEMBERS.map((member) => (
          <Card key={member.id} className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white font-semibold text-lg">
              {member.name.split(" ").pop()?.[0]}
            </div>
            <div>
              <p className="font-medium text-white">{member.name}</p>
              <p className="text-sm text-zinc-500">{member.role}</p>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
