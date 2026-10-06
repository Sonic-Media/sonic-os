import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  correctClosedDayExpenditure,
  listFinancialCorrections,
} from "@/lib/server/services/financial-corrections-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const corrections = await withDatabase(
      () =>
        listFinancialCorrections({
          branch: searchParams.get("branch"),
          date: searchParams.get("date"),
          sourceId: searchParams.get("sourceId"),
          sourceType: searchParams.get("sourceType"),
        }),
      { request, ownerOnly: true }
    );
    return jsonOk(corrections);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await withDatabase(() => correctClosedDayExpenditure(body), {
      request,
      ownerOnly: true,
      module: "expenses",
    });
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
