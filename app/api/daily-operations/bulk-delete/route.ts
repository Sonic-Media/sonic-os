import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { removeDailyOperationsByIds } from "@/lib/server/services/daily-operations-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const deleted = await withDatabase(() => removeDailyOperationsByIds(ids));
    return jsonOk({ deleted });
  } catch (error) {
    return handleRouteError(error);
  }
}
