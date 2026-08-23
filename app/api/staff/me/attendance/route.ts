import { jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { listStaffAttendanceEntries } from "@/lib/server/services/system-audit-log-service";
import { getLinkedStaffForUser } from "@/lib/server/services/staff-service";
import { requireSession } from "@/lib/server/session";
import { getTodayISO } from "@/lib/dates";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date")?.trim() || getTodayISO();

    const records = await withDatabase(async () => {
      const session = await requireSession();
      const linkedStaff = await getLinkedStaffForUser(session.userId);

      if (!linkedStaff) {
        throw new ApiError("No staff profile is linked to your account.", {
          status: 404,
          code: "staff_not_linked",
        });
      }

      return listStaffAttendanceEntries(linkedStaff.id, date);
    }, { request, module: "operations" });

    return jsonOk(records);
  } catch (error) {
    return handleRouteError(error);
  }
}
