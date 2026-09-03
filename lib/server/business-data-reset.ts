import { z } from "zod";
import {
  BUSINESS_RESET_CATEGORIES,
  type BusinessResetCategory,
} from "@/lib/business-reset/categories";
import {
  getBusinessDataResetPreview,
  runBusinessDataReset,
  type BusinessResetPreview,
  type BusinessResetReport,
} from "@/lib/server/business-data-reset-service";
import { assertBusinessDataResetConfirmation } from "@/lib/server/data-protection/guards";

const businessResetCategorySchema = z.enum([
  "products",
  "stockMovements",
  "purchases",
  "sales",
  "customers",
  "suppliers",
  "expenses",
  "dailyOperations",
  "staffPayments",
  "activityLogs",
]);

const resetBusinessDataBodySchema = z.object({
  confirmation: z.string().min(1),
  categories: z.array(businessResetCategorySchema).min(1),
});

export async function previewBusinessDataReset(): Promise<BusinessResetPreview> {
  return getBusinessDataResetPreview();
}

export async function resetBusinessData(body: unknown): Promise<BusinessResetReport> {
  const parsed = resetBusinessDataBodySchema.parse(body);
  assertBusinessDataResetConfirmation(parsed.confirmation);

  return runBusinessDataReset({
    categories: parsed.categories as BusinessResetCategory[],
  });
}
