import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createPurchase,
  listPurchases,
} from "@/lib/server/services/purchasing-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET(request: Request) {
  try {
    const purchases = await withDatabase(() => listPurchases(), { request });
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
