import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";

const roleSlugToId = new Map<string, string>();

export async function getRoleIdBySlug(slug: string): Promise<string> {
  const normalized = slug.trim().toLowerCase();
  const cached = roleSlugToId.get(normalized);
  if (cached) return cached;

  const role = await prisma.role.findUnique({ where: { slug: normalized } });
  if (!role) {
    throw new ApiError(`Role not found: ${slug}`, {
      status: 404,
      code: "role_not_found",
    });
  }

  roleSlugToId.set(normalized, role.id);
  return role.id;
}

export function clearRoleLookupCache() {
  roleSlugToId.clear();
}
