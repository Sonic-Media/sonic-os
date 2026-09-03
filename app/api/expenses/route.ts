import { jsonCreated, jsonOk } from "@/lib/api/response";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  createExpense,
  listExpenses,
} from "@/lib/server/services/expenses-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET(request: Request) {
  try {
    const expenses = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveBranchListFilter(session);
      return listExpenses(branchFilter);
    }, { request });
    return jsonOk(expenses);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const createdBy = normalizeStaffActionRecord(body.createdBy);
    const expense = await withDatabase(
      () => createExpense(body, createdBy),
      { request }
    );
    return jsonCreated(expense);
  } catch (error) {
    return handleRouteError(error);
  }
}
