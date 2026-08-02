import type { BranchEntity } from "@/types/branch";
import type { Branch as PrismaBranch } from "@/lib/prisma";

export function mapBranchToEntity(branch: PrismaBranch): BranchEntity {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address ?? undefined,
    phone: branch.phone ?? undefined,
    manager: branch.manager ?? undefined,
    active: branch.active,
    createdAt: branch.createdAt.toISOString(),
  };
}
