import { z } from "zod";

export const branchInputSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required."),
  code: z
    .string()
    .trim()
    .min(1, "Branch code is required.")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, or hyphens."),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  manager: z.string().trim().optional(),
});

export const branchUpdateSchema = branchInputSchema;

export type BranchInputPayload = z.infer<typeof branchInputSchema>;
