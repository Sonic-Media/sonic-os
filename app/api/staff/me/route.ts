import { jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { getLinkedStaffForUser } from "@/lib/server/services/staff-service";
import { requireSession } from "@/lib/server/session";

export async function GET() {
  try {
    const staff = await withDatabase(async () => {
      const session = await requireSession();
      const linkedStaff = await getLinkedStaffForUser(session.userId);

      if (!linkedStaff) {
        throw new ApiError("No staff profile is linked to your account.", {
          status: 404,
          code: "staff_not_linked",
        });
      }

      return linkedStaff;
    }, { module: "operations" });

    return jsonOk(staff);
  } catch (error) {
    return handleRouteError(error);
  }
}
