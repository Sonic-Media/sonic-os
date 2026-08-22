import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { deleteStaff, updateStaff } from "@/lib/server/services/staff-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const staff = await withDatabase(() => updateStaff(id, body), {
      request,
      ownerOnly: true,
    });
    return jsonOk(staff);
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
    await withDatabase(() => deleteStaff(id), { request, ownerOnly: true });
    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error);
  }
}
