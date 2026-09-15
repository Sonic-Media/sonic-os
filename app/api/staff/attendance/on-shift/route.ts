import { jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { getStaffOnShiftAtBranch } from "@/lib/server/services/attendance-service";
import { getBranchIdForSession } from "@/lib/server/branch-lookup";
import { requireSession } from "@/lib/server/session";
import { getTodayISO } from "@/lib/dates";
import type { Branch } from "@/types";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const branch = url.searchParams.get("branch")?.trim();
    const date = url.searchParams.get("date")?.trim() || getTodayISO();

    if (!branch) {
      throw new ApiError("branch is required.", {
        status: 400,
        code: "invalid_request",
      });
    }

    const staffOnShift = await withDatabase(async () => {
      const session = await requireSession();
      await getBranchIdForSession(session, branch as Branch);
      return getStaffOnShiftAtBranch(branch as Branch, date);
    }, { request, module: "operations" });

    return jsonOk(staffOnShift);
  } catch (error) {
    return handleRouteError(error);
  }
}
