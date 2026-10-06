import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { getFinancialDetail } from "@/lib/server/services/financial-detail-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const detail = await withDatabase(
      () =>
        getFinancialDetail({
          branch: searchParams.get("branch"),
          date: searchParams.get("date"),
        }),
      { request, ownerOnly: true, module: "reports" }
    );
    return jsonOk(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}
