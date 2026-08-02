import { prisma } from "@/lib/db";
import { mapRoleToDefinition } from "@/lib/server/mappers/entities";
import type { StaffRoleDefinition } from "@/types/staff-role";

function sortRoles(roles: StaffRoleDefinition[]): StaffRoleDefinition[] {
  return [...roles].sort((left, right) => left.name.localeCompare(right.name));
}

export async function listRoles(): Promise<StaffRoleDefinition[]> {
  const roles = await prisma.role.findMany({
    where: {
      slug: { not: "owner" },
    },
    orderBy: { name: "asc" },
  });

  const definitions = roles
    .map(mapRoleToDefinition)
    .filter((role): role is StaffRoleDefinition => role !== null);

  return sortRoles(definitions);
}
