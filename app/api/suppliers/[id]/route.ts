import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  deleteSupplier,
  updateSupplier,
} from "@/lib/server/services/purchasing-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const supplier = await withDatabase(() => updateSupplier(id, body));
    return jsonOk(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await withDatabase(() => deleteSupplier(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
