import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createStaffPayment,
  listStaffPayments,
} from "@/lib/server/services/staff-payments-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET() {
  try {
    const payments = await withDatabase(() => listStaffPayments());
    return jsonOk(payments);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paidBy = normalizeStaffActionRecord(body.paidBy);
    const payment = await withDatabase(() => createStaffPayment(body, paidBy));
    return jsonCreated(payment);
  } catch (error) {
    return handleRouteError(error);
  }
}
