import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createExpense,
  listExpenses,
} from "@/lib/server/services/expenses-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET() {
  try {
    const expenses = await withDatabase(() => listExpenses());
    return jsonOk(expenses);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const createdBy = normalizeStaffActionRecord(body.createdBy);
    const expense = await withDatabase(() => createExpense(body, createdBy));
    return jsonCreated(expense);
  } catch (error) {
    return handleRouteError(error);
  }
}
