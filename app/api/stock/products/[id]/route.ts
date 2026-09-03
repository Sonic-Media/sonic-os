import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withSessionDatabase } from "@/lib/server/route-handler";
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
    const product = await withSessionDatabase(
      (session) => updateProduct(id, body, session),
      { request, module: "stock" }
    );
    return jsonOk(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await withSessionDatabase(() => deleteProduct(id), {
      request,
      module: "stock",
    });
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
