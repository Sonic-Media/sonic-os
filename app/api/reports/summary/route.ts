import { ApiError } from "@/lib/api/errors";
import { aggregateEntries } from "@/lib/aggregations";
import { jsonOk } from "@/lib/api/response";
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
      const entries = await listDailyOperationsInPeriod(period);
      return aggregateEntries(entries);
    });

    return jsonOk(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
