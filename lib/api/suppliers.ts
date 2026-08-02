import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  Supplier,
  SupplierInput,
  SupplierUpdateInput,
} from "@/types/purchasing";

export async function fetchSuppliers(): Promise<Supplier[]> {
  return apiGet<Supplier[]>("/api/suppliers");
}

export async function createSupplierApi(
  input: SupplierInput
): Promise<Supplier> {
  return apiPost<Supplier>("/api/suppliers", input);
}

export async function updateSupplierApi(
  id: string,
  input: SupplierUpdateInput
): Promise<Supplier> {
  return apiPatch<Supplier>(`/api/suppliers/${id}`, input);
}

export async function deleteSupplierApi(id: string): Promise<void> {
  await apiDelete<{ id: string }>(`/api/suppliers/${id}`);
}
