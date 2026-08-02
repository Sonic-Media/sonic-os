import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createCustomer,
  listCustomers,
} from "@/lib/server/services/customers-service";

export async function GET() {
  try {
    const customers = await withDatabase(() => listCustomers());
    return jsonOk(customers);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = await withDatabase(() => createCustomer(body));
    return jsonCreated(customer);
  } catch (error) {
    return handleRouteError(error);
  }
}
