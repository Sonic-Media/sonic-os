import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { mapCustomerToEntity } from "@/lib/server/mappers/entities";
import { getSessionFromRequest } from "@/lib/server/session";
import { recordTransactionAudit } from "@/lib/server/transaction-audit";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import {
  hasValidationErrors,
  validateCustomerInput,
} from "@/lib/sales/validation";
import type { Customer, CustomerInput, CustomerUpdateInput } from "@/types/sales";

function sortCustomers(customers: Customer[]): Customer[] {
  return [...customers].sort((left, right) => left.name.localeCompare(right.name));
}

async function getCustomerRecord(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer) {
    throw new ApiError("Customer not found.", {
      status: 404,
      code: "not_found",
    });
  }

  return customer;
}

export async function listCustomers(): Promise<Customer[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });

  return customers.map(mapCustomerToEntity);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const errors = validateCustomerInput(input);
  if (hasValidationErrors(errors)) {
    throw new ApiError("Invalid customer input.", {
      status: 400,
      code: "validation_error",
      details: errors,
    });
  }

  const customer = await prisma.customer.create({
    data: {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  return mapCustomerToEntity(customer);
}

export async function updateCustomer(
  id: string,
  input: CustomerUpdateInput
): Promise<Customer> {
  const existing = await getCustomerRecord(id);

  const errors = validateCustomerInput(input);
  if (hasValidationErrors(errors)) {
    throw new ApiError("Invalid customer input.", {
      status: 400,
      code: "validation_error",
      details: errors,
    });
  }

  const trimmedName = input.name.trim();
  const session = await getSessionFromRequest();

  const customer = await prisma.$transaction(async (tx) => {
    if (existing.name !== trimmedName) {
      await tx.sale.updateMany({
        where: { customerId: id },
        data: { customerName: trimmedName },
      });
    }

    const updated = await tx.customer.update({
      where: { id },
      data: {
        name: trimmedName,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    if (session) {
      await recordTransactionAudit(
        tx,
        session,
        AUDIT_ACTIONS.EDIT,
        `Customer updated to ${trimmedName}.`
      );
    }

    return updated;
  });

  return mapCustomerToEntity(customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  await getCustomerRecord(id);

  const salesCount = await prisma.sale.count({ where: { customerId: id } });
  if (salesCount > 0) {
    throw new ApiError("Cannot delete a customer that has sales records.", {
      status: 400,
      code: "customer_in_use",
    });
  }

  await prisma.customer.delete({ where: { id } });
}

export function sortCustomerEntities(customers: Customer[]): Customer[] {
  return sortCustomers(customers);
}
