import { z } from "zod";

const expenseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  amount: z.number().int().min(0),
});

export const entryImportSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().min(1),
  timestamp: z.number().int(),
  branch: z.string().trim().min(1),
  sales: z.number().int().min(0),
  expenses: z.array(expenseSchema).default([]),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  notes: z.string().default(""),
  savingsAllocation: z.number().int().nullable().optional(),
  status: z.enum(["draft", "completed"]).default("draft"),
  createdAt: z.string().optional(),
});

export const importDailyOperationsSchema = z.array(entryImportSchema).max(5000);

export type ImportDailyOperationsInput = z.infer<typeof importDailyOperationsSchema>;
