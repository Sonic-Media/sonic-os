import { jsonCreated, jsonOk } from "@/lib/api/response";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  createStaffPayment,
  listStaffPayments,
} from "@/lib/server/services/staff-payments-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET(request: Request) {
  try {
    const payments = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveBranchListFilter(session);
      return listStaffPayments(branchFilter);
    }, { request });
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
