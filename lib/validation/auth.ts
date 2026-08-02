import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters."),
  displayName: z.string().trim().min(1, "Display name is required."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.string().trim().min(1),
  branch: z.string().trim().min(1),
  staffId: z.string().trim().optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required."),
  role: z.string().trim().min(1),
  branch: z.string().trim().min(1),
});

export const activeBranchSchema = z.object({
  branchCode: z.string().trim().min(1, "Branch code is required."),
});
