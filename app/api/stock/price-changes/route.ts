import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  createPriceChange,
  listPriceChanges,
} from "@/lib/server/services/stock-service";

export async function GET(request: Request) {
  try {
    const priceChanges = await withSessionDatabase(
      (session) => listPriceChanges(session),
      { request, module: "stock" }
    );
    return jsonOk(priceChanges);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const priceChange = await withDatabase(() => createPriceChange(body), {
      request,
    });
    return jsonCreated(priceChange);
  } catch (error) {
    return handleRouteError(error);
  }
}
