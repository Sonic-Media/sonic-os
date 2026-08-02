import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createMovement,
  listMovements,
} from "@/lib/server/services/stock-service";
import { normalizeStaffActionRecord } from "@/lib/staff/session";

export async function GET() {
  try {
    const movements = await withDatabase(() => listMovements());
    return jsonOk(movements);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const createdBy = normalizeStaffActionRecord(body.createdBy);
    const movement = await withDatabase(() => createMovement(body, createdBy));
    return jsonCreated(movement);
  } catch (error) {
    return handleRouteError(error);
  }
}
