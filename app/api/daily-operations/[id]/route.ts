import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { deleteDailyOperation } from "@/lib/server/services/daily-operations-service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await withDatabase(() => deleteDailyOperation(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
