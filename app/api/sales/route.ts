import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { createSale, listSales } from "@/lib/server/services/sales-service";

export async function GET(request: Request) {
  try {
    const sales = await withDatabase(() => listSales(), { request });
    return jsonOk(sales);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sale = await withDatabase(() => createSale(body), { request });
    return jsonCreated(sale);
  } catch (error) {
    return handleRouteError(error);
  }
}
