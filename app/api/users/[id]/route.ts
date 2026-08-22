import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { deleteUser, updateUser } from "@/lib/server/services/users-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const user = await withDatabase(() => updateUser(id, body), { request });
    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await withDatabase(() => deleteUser(id), { request });
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
