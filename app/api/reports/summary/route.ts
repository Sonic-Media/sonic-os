import { ApiError } from "@/lib/api/errors";
import { aggregateEntries } from "@/lib/aggregations";
import { jsonOk } from "@/lib/api/response";
import { isOwnerRole } from "@/lib/auth/validation";
import { getEquivalentBranchCodes } from "@/lib/branch/codes";
import { parseReportReferenceDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { resolveReportsBranchFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withSessionDatabase } from "@/lib/server/route-handler";
import { listDailyOperationsInPeriod } from "@/lib/server/services/daily-operations-service";
import type { Branch, ReportPeriod } from "@/types";

const VALID_PERIODS: ReportPeriod[] = ["daily", "weekly", "monthly", "yearly"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "daily") as ReportPeriod;
    const branchParam = searchParams.get("branch");
    const dateParam = searchParams.get("date");

    if (!VALID_PERIODS.includes(period)) {
      throw new ApiError("Invalid period.", {
        status: 400,
        code: "validation_error",
      });
    }

    let referenceDate = new Date();
    if (dateParam) {
      try {
        referenceDate = parseReportReferenceDate(dateParam);
      } catch {
        throw new ApiError("Invalid date.", {
          status: 400,
          code: "validation_error",
        });
      }
    }

    const summary = await withSessionDatabase(async (session) => {
      const { filter: branchFilter, scope } = await resolveReportsBranchFilter(
        session,
        branchParam
      );

      const [entries, branches] = await Promise.all([
        listDailyOperationsInPeriod(period, referenceDate, branchFilter),
        prisma.branch.findMany({
          where: { active: true },
          select: { code: true },
          orderBy: { name: "asc" },
        }),
      ]);

      const branchIds: Branch[] = isOwnerRole(session.role)
        ? scope === "all"
          ? branches.map((branch) => branch.code)
          : [scope]
        : getEquivalentBranchCodes(session.branch);

      return aggregateEntries(entries, { branchIds });
    }, { request, module: "reports" });

    return jsonOk(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
