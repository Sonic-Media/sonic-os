import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  deleteProduct,
  updateProduct,
} from "@/lib/server/services/stock-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const product = await withDatabase(() => updateProduct(id, body));
    return jsonOk(product);
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
    await withDatabase(() => deleteProduct(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
