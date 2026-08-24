import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { createStaff, listStaffForSession } from "@/lib/server/services/staff-service";

export async function GET() {
  try {
    const staff = await withDatabase(() => listStaffForSession(), {
      module: "operations",
    });
    return jsonOk(staff);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const staff = await withDatabase(() => createStaff(body), {
      request,
      ownerOnly: true,
    });
    return jsonCreated(staff);
  } catch (error) {
    return handleRouteError(error);
  }
}
