import { ApiError } from "@/lib/api/errors";
import { aggregateEntries } from "@/lib/aggregations";
import { jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
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

    const summary = await withDatabase(async () => {
      const [entries, branches] = await Promise.all([
        listDailyOperationsInPeriod(period),
        prisma.branch.findMany({
          where: { active: true },
          select: { code: true },
          orderBy: { name: "asc" },
        }),
      ]);

      return aggregateEntries(entries, {
        branchIds: branches.map((branch) => branch.code),
      });
    }, { request });

    return jsonOk(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
