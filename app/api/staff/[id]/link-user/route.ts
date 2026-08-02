import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { linkStaffUser } from "@/lib/server/services/staff-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const staff = await withDatabase(() => linkStaffUser(id, body.userId, body.username)
    );
    return jsonOk(staff);
  } catch (error) {
    return handleRouteError(error);
  }
}
