import { ApiError } from "@/lib/api/errors";
import { getTodayISO } from "@/lib/dates";
import {
  canAccessCloseDay,
  canOpenShop,
} from "@/lib/day-closing/permissions";
import { isBranchDayClosed } from "@/lib/server/services/day-closings-service";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

export function isHistoricalOperationsDate(date: string): boolean {
  return date !== getTodayISO();
}

export function assertStaffOperationalRole(session: AuthSession): void {
  if (session.role === "owner") {
    throw new ApiError("Owners cannot perform staff operational actions.", {
      status: 403,
      code: "forbidden",
    });
  }
}

/**
 * Live-day staff actions stay staff-only. Historical corrections allow owners.
 */
export function assertStaffOperationalRoleForPayment(
  session: AuthSession,
  date: string
): void {
  if (session.role === "owner" && !isHistoricalOperationsDate(date)) {
    throw new ApiError("Owners cannot perform staff operational actions.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function assertCanOpenShop(session: AuthSession): void {
  if (!canOpenShop(session.role)) {
    throw new ApiError("You do not have permission to open the shop.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function assertCanCloseDay(session: AuthSession): void {
  if (!canAccessCloseDay(session.role)) {
    throw new ApiError("You do not have permission to close the day.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function assertOwnerCannotEditTodayOperations(
  session: AuthSession,
  date: string
): void {
  if (session.role === "owner" && date === getTodayISO()) {
    throw new ApiError("Owners cannot edit today's operational records.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export async function assertBranchDayOpenForWrite(
  branch: Branch,
  date: string
): Promise<void> {
  if (await isBranchDayClosed(branch, date)) {
    throw new ApiError("This branch day is closed. Records cannot be changed.", {
      status: 409,
      code: "day_closed",
    });
  }
}
