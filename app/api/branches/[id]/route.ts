import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  setBranchActive,
  updateBranch,
} from "@/lib/server/services/branches-service";
import { requireSession } from "@/lib/server/session";
import { isDatabaseConfigured } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";

const patchBranchSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    manager: z.string().trim().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.code !== undefined ||
      value.address !== undefined ||
      value.phone !== undefined ||
      value.manager !== undefined ||
      value.active !== undefined,
    { message: "No updates provided." }
  );

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      throw new ApiError("Database is not configured.", {
        status: 503,
        code: "database_unavailable",
      });
    }

    await requireSession();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchBranchSchema.parse(body);

    if (parsed.active !== undefined && parsed.active !== true) {
      const branch = await setBranchActive(id, false);
      return jsonOk(branch);
    }

    if (parsed.active === true) {
      const branch = await setBranchActive(id, true);
      return jsonOk(branch);
    }

    const branch = await updateBranch(id, parsed);
    return jsonOk(branch);
  } catch (error) {
    return jsonError(error);
  }
}
