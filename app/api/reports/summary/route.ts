import { ApiError } from "@/lib/api/errors";
import { aggregateEntries } from "@/lib/aggregations";
import { jsonOk } from "@/lib/api/response";
import { isOwnerRole } from "@/lib/auth/validation";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { prisma } from "@/lib/db";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withSessionDatabase } from "@/lib/server/route-handler";
import { listDailyOperationsInPeriod } from "@/lib/server/services/daily-operations-service";
import type { ReportPeriod } from "@/types";

const VALID_PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "yearly"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "daily") as ReportPeriod;

    if (!VALID_PERIODS.includes(period)) {
      throw new ApiError("Invalid period.", {
        status: 400,
        code: "validation_error",
      });
    }

    const summary = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveBranchListFilter(session);
      const [entries, branches] = await Promise.all([
        listDailyOperationsInPeriod(period, new Date(), branchFilter),
        prisma.branch.findMany({
          where: { active: true },
          select: { code: true },
          orderBy: { name: "asc" },
        }),
      ]);

      const branchIds = isOwnerRole(session.role)
        ? branches.map((branch) => branch.code)
        : getEquivalentBranchCodes(session.branch);

      return aggregateEntries(entries, { branchIds });
    }, { request, module: "reports" });

    return jsonOk(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
