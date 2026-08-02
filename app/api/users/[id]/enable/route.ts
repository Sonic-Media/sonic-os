import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { enableUser } from "@/lib/server/services/users-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await withDatabase(() => enableUser(id));
    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error);
  }
}
