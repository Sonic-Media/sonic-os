import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { listBranchProductsForSale } from "@/lib/server/services/sales-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const branch = url.searchParams.get("branch");

    const products = await withDatabase(
      () => listBranchProductsForSale(branch),
      { request, module: "sales" }
    );

    return jsonOk(products);
  } catch (error) {
    return handleRouteError(error);
  }
}
