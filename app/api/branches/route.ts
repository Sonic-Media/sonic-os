import { jsonCreated, jsonOk } from "@/lib/api/response";
import {
  createBranch,
  listBranches,
} from "@/lib/server/services/branches-service";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";

export async function GET(request: Request) {
  try {
    const branches = await withDatabase(() => listBranches(), { request });
    return jsonOk(branches);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const branch = await withDatabase(() => createBranch(body), {
      permission: "manage_branches",
      request,
    });
    return jsonCreated(branch);
  } catch (error) {
    return handleRouteError(error);
  }
}
