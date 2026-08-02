import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  listDailyOperations,
  upsertDailyOperation,
} from "@/lib/server/services/daily-operations-service";

export async function GET() {
  try {
    const entries = await withDatabase(() => listDailyOperations());
    return jsonOk(entries);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = await withDatabase(() => upsertDailyOperation(body));
    return jsonCreated(entry);
  } catch (error) {
    return handleRouteError(error);
  }
}
