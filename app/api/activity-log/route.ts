import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createActivityLog,
  listActivityLogs,
} from "@/lib/server/services/activity-log-service";

export async function GET(request: Request) {
  try {
    const records = await withDatabase(() => listActivityLogs(), { request });
    return jsonOk(records);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await withDatabase(() => createActivityLog(body), {
      request,
    });
    return jsonCreated(record);
  } catch (error) {
    return handleRouteError(error);
  }
}
