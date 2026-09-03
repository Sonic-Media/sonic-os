import { jsonCreated, jsonOk } from "@/lib/api/response";
import { resolveOperationsListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  closeDay,
  listDayClosings,
  openDay,
  reopenDay,
} from "@/lib/server/services/day-closings-service";

export async function GET(request: Request) {
  try {
    const closings = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveOperationsListFilter(session);
      return listDayClosings(branchFilter);
    }, { request });
    return jsonOk(closings);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "reopen") {
      const record = await withDatabase(() => reopenDay(body), {
        request,
        module: "operations",
      });
      return jsonOk(record);
    }

    if (action === "open") {
      const record = await withDatabase(() => openDay(body), {
        request,
        module: "operations",
      });
      return jsonCreated(record);
    }

    const record = await withDatabase(() => closeDay(body), {
      request,
      module: "operations",
    });
    return jsonCreated(record);
  } catch (error) {
    return handleRouteError(error);
  }
}
