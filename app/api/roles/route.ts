import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { listRoles } from "@/lib/server/services/roles-service";

export async function GET(request: Request) {
  try {
    const roles = await withDatabase(() => listRoles());
    return jsonOk(roles);
  } catch (error) {
    return handleRouteError(error);
  }
}
