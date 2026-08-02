import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createPriceChange,
  listPriceChanges,
} from "@/lib/server/services/stock-service";

export async function GET() {
  try {
    const priceChanges = await withDatabase(() => listPriceChanges());
    return jsonOk(priceChanges);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const priceChange = await withDatabase(() => createPriceChange(body));
    return jsonCreated(priceChange);
  } catch (error) {
    return handleRouteError(error);
  }
}
