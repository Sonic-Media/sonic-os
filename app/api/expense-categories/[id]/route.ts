import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  deleteCategory,
  updateCategory,
} from "@/lib/server/services/expenses-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const category = await withDatabase(() => updateCategory(id, body));
    return jsonOk(category);
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
    await withDatabase(() => deleteCategory(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
