import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  previewBusinessDayWipe,
  wipeBusinessDay,
} from "@/lib/server/services/business-day-wipe-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preview = await withDatabase(
      () =>
        previewBusinessDayWipe({
          branch: searchParams.get("branch"),
          date: searchParams.get("date"),
        }),
      { request, ownerOnly: true }
    );
    return jsonOk(preview);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report = await withDatabase(() => wipeBusinessDay(body), {
      request,
      ownerOnly: true,
      module: "operations",
    });
    return jsonOk(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
