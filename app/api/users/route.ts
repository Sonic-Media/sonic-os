import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { createUser, listUsers } from "@/lib/server/services/users-service";

export async function GET() {
  try {
    const users = await withDatabase(() => listUsers());
    return jsonOk(users);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await withDatabase(() => createUser(body));
    return jsonCreated(user);
  } catch (error) {
    return handleRouteError(error);
  }
}
