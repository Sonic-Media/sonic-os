import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { resetUserPassword } from "@/lib/server/services/users-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const user = await withDatabase(() => resetUserPassword(id, body.password));
    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error);
  }
}
