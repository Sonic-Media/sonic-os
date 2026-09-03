import { jsonCreated, jsonOk } from "@/lib/api/response";
import { resolveOperationsListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  listDailyOperations,
  upsertDailyOperation,
} from "@/lib/server/services/daily-operations-service";

export async function GET(request: Request) {
  try {
    const entries = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveOperationsListFilter(session);
      return listDailyOperations(branchFilter);
    }, { request, module: "operations" });
    return jsonOk(entries);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = await withDatabase(() => upsertDailyOperation(body), {
      request,
      module: "operations",
    });
    return jsonCreated(entry);
  } catch (error) {
    return handleRouteError(error);
  }
}
