import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { assertProductionBulkDeleteConfirmation } from "@/lib/server/data-protection/guards";
import { removeDailyOperationsByIds } from "@/lib/server/services/daily-operations-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const confirmation =
      typeof body.confirmation === "string" ? body.confirmation : undefined;

    const deleted = await withDatabase(async () => {
      assertProductionBulkDeleteConfirmation(confirmation);
      return removeDailyOperationsByIds(ids);
    });

    return jsonOk({ deleted });
  } catch (error) {
    return handleRouteError(error);
  }
}
