import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { unlinkStaffUser } from "@/lib/server/services/staff-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const staff = await withDatabase(() => unlinkStaffUser(id));
    return jsonOk(staff);
  } catch (error) {
    return handleRouteError(error);
  }
}
