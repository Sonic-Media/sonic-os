import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { importDailyOperationsBodySchema } from "@/lib/validation/daily-operations";
import { parseJsonBody } from "@/lib/validation/request";
import { importDailyOperations } from "@/lib/server/services/daily-operations-service";
import type { Entry } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, importDailyOperationsBodySchema);
    const entries = await withDatabase(
      () => importDailyOperations(body.entries as Entry[]),
      {
        ownerOnly: true,
      }
    );
    return jsonOk(entries);
  } catch (error) {
    return handleRouteError(error, {
      method: "POST",
      pathname: "/api/daily-operations/import",
    });
  }
}
