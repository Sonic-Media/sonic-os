import { Prisma } from "@/lib/prisma";
import type { StaffActionRecord } from "@/types/staff-session";

export function toJsonField<T>(
  value: T | undefined | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export function fromJsonField<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined;
  return value as T;
}

export function mapStaffActionRecord(value: unknown): StaffActionRecord | undefined {
  return fromJsonField<StaffActionRecord>(value);
}
