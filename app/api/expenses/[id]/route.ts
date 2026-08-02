import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  deleteExpense,
  updateExpense,
} from "@/lib/server/services/expenses-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const expense = await withDatabase(() => updateExpense(id, body));
    return jsonOk(expense);
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
    await withDatabase(() => deleteExpense(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
