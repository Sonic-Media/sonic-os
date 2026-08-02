import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  deleteCustomer,
  updateCustomer,
} from "@/lib/server/services/customers-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const customer = await withDatabase(() => updateCustomer(id, body));
    return jsonOk(customer);
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
    await withDatabase(() => deleteCustomer(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
