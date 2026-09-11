import { jsonCreated } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { recordAttendanceAction } from "@/lib/server/services/attendance-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await withDatabase(() => recordAttendanceAction(body), {
      request,
      module: "operations",
    });
    return jsonCreated(record);
  } catch (error) {
    return handleRouteError(error);
  }
}
