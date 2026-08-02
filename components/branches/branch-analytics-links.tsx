import Link from "next/link";
import { Card } from "@/components/shared/ui/card";
import type { BranchEntity } from "@/types/branch";

interface BranchAnalyticsLinksProps {
  branches: BranchEntity[];
}

export function BranchAnalyticsLinks({ branches }: BranchAnalyticsLinksProps) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-500 mb-3 tracking-wide uppercase">
        Branch Dashboards
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {branches.map((branch) => (
          <Link key={branch.id} href={`/branches/analytics/${branch.code}`}>
            <Card className="transition-colors hover:border-zinc-600">
              <h3 className="text-base font-semibold text-white">{branch.name}</h3>
              <p className="text-sm text-zinc-500 mt-1">
                View branch intelligence dashboard
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
