import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createProduct,
  listProducts,
} from "@/lib/server/services/stock-service";

export async function GET() {
  try {
    const products = await withDatabase(() => listProducts());
    return jsonOk(products);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await withDatabase(() => createProduct(body));
    return jsonCreated(product);
  } catch (error) {
    return handleRouteError(error);
  }
}
