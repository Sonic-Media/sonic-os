import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createSupplier,
  listSuppliers,
} from "@/lib/server/services/purchasing-service";

export async function GET() {
  try {
    const suppliers = await withDatabase(() => listSuppliers());
    return jsonOk(suppliers);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supplier = await withDatabase(() => createSupplier(body));
    return jsonCreated(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}
