import { jsonCreated, jsonOk } from "@/lib/api/response";
import { resolveBranchListFilter } from "@/lib/server/branch-scope";
import { handleRouteError, withDatabase, withSessionDatabase } from "@/lib/server/route-handler";
import { createSale, listSales } from "@/lib/server/services/sales-service";

export async function GET(request: Request) {
  try {
    const sales = await withSessionDatabase(async (session) => {
      const branchFilter = await resolveBranchListFilter(session);
      return listSales(branchFilter);
    }, { request });
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
