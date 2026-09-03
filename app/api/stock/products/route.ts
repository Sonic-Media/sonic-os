import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import {
  createProduct,
  listProducts,
} from "@/lib/server/services/stock-service";

function logStockProductsRouteError(method: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      event: "stock.products.route.error",
      timestamp: new Date().toISOString(),
      method,
      pathname: "/api/stock/products",
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    })
  );
}

export async function GET(request: Request) {
  const pathname = new URL(request.url).pathname;
  try {
    const products = await withSessionDatabase(
      (session) => listProducts(session),
      { request, module: "stock" }
    );
    return jsonOk(products);
  } catch (error) {
    logStockProductsRouteError("GET", error);
    return handleRouteError(error, { method: "GET", pathname });
  }
}

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  try {
    const body = await request.json();
    const product = await withDatabase(() => createProduct(body), { request });
    return jsonCreated(product);
  } catch (error) {
    logStockProductsRouteError("POST", error);
    return handleRouteError(error, { method: "POST", pathname });
  }
}
