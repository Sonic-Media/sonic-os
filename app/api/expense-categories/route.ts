import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createCategory,
  listCategories,
} from "@/lib/server/services/expenses-service";

export async function GET() {
  try {
    const categories = await withDatabase(() => listCategories());
    return jsonOk(categories);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const category = await withDatabase(() => createCategory(body));
    return jsonCreated(category);
  } catch (error) {
    return handleRouteError(error);
  }
}
