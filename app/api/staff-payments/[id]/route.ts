import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  deleteStaffPayment,
  getStaffPaymentById,
  updateStaffPayment,
} from "@/lib/server/services/staff-payments-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const payment = await withDatabase(async () => {
      const record = await getStaffPaymentById(id);
      if (!record) {
        throw new Error("Staff payment not found.");
      }
      return record;
    });
    return jsonOk(payment);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payment = await withDatabase(() =>
      updateStaffPayment(id, {
        notes: typeof body.notes === "string" ? body.notes : undefined,
        amount: typeof body.amount === "number" ? body.amount : undefined,
      })
    );
    return jsonOk(payment);
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
    await withDatabase(() => deleteStaffPayment(id));
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
