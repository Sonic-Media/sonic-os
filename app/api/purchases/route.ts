import { jsonCreated, jsonOk } from "@/lib/api/response";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  createPurchase,
  listPurchases,
} from "@/lib/server/services/purchasing-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET(request: Request) {
  try {
    const purchases = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveBranchListFilter(session);
      return listPurchases(branchFilter);
    }, { request });
    return jsonOk(purchases);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const createdBy = normalizeStaffActionRecord(body.createdBy);
    const purchase = await withDatabase(
      () => createPurchase(body, createdBy),
      { request }
    );
    return jsonCreated(purchase);
  } catch (error) {
    return handleRouteError(error);
  }
}
