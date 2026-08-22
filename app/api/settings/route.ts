import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  getAppSettings,
  updateAppSettings,
} from "@/lib/server/services/settings-service";

export async function GET(request: Request) {
  try {
    const settings = await withDatabase(() => getAppSettings(), { request });
    return jsonOk(settings);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const settings = await withDatabase(() => updateAppSettings(body), {
      request,
      module: "settings",
    });
    return jsonOk(settings);
  } catch (error) {
    return handleRouteError(error);
  }
}
