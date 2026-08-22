import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import type { ExpenseTemplate } from "@/types";

const templateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  category: z.string().trim().min(1, "Category is required."),
  defaultAmount: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const templatePatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  defaultAmount: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

function mapExpenseTemplate(record: {
  id: string;
  name: string;
  category: string;
  defaultAmount: number | null;
  active: boolean;
}): ExpenseTemplate {
  return {
    id: record.id,
    name: record.name,
    category: record.category as ExpenseTemplate["category"],
    defaultAmount: record.defaultAmount ?? undefined,
    active: record.active,
  };
}

function sortTemplates(templates: ExpenseTemplate[]): ExpenseTemplate[] {
  return [...templates].sort((left, right) => left.name.localeCompare(right.name));
}

export async function listExpenseTemplates(): Promise<ExpenseTemplate[]> {
  const templates = await prisma.expenseTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return sortTemplates(templates.map(mapExpenseTemplate));
}

export async function createExpenseTemplate(
  input: unknown
): Promise<ExpenseTemplate> {
  const parsed = templateInputSchema.parse(input);

  const template = await prisma.expenseTemplate.create({
    data: {
      id: randomUUID(),
      name: parsed.name.trim(),
      category: parsed.category,
      defaultAmount: parsed.defaultAmount ?? null,
      active: parsed.active ?? true,
    },
  });

  return mapExpenseTemplate(template);
}

export async function updateExpenseTemplate(
  id: string,
  input: unknown
): Promise<ExpenseTemplate> {
  const parsed = templatePatchSchema.parse(input);

  const existing = await prisma.expenseTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Expense template not found.", {
      status: 404,
      code: "not_found",
    });
  }

  const template = await prisma.expenseTemplate.update({
    where: { id },
    data: {
      name: parsed.name?.trim(),
      category: parsed.category,
      defaultAmount:
        parsed.defaultAmount === undefined
          ? undefined
          : parsed.defaultAmount,
      active: parsed.active,
    },
  });

  return mapExpenseTemplate(template);
}

export async function deleteExpenseTemplate(id: string): Promise<void> {
  const existing = await prisma.expenseTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError("Expense template not found.", {
      status: 404,
      code: "not_found",
    });
  }

  await prisma.expenseTemplate.delete({ where: { id } });
}
