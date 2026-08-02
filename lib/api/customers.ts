import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  Customer,
  CustomerInput,
  CustomerUpdateInput,
} from "@/types/sales";

export async function fetchCustomers(): Promise<Customer[]> {
  return apiGet<Customer[]>("/api/customers");
}

export async function createCustomerApi(
  input: CustomerInput
): Promise<Customer> {
  return apiPost<Customer>("/api/customers", input);
}

export async function updateCustomerApi(
  id: string,
  input: CustomerUpdateInput
): Promise<Customer> {
  return apiPatch<Customer>(`/api/customers/${id}`, input);
}

export async function deleteCustomerApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/customers/${id}`);
}
