import { ApiError } from "@/lib/api/errors";
import { getTodayISO } from "@/lib/dates";
import {
  canApproveAndClose,
  canOpenShop,
  canSubmitCloseRequest,
} from "@/lib/day-closing/permissions";
import { getBranchDayState } from "@/lib/server/services/day-closings-service";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

export function assertStaffOperationalRole(session: AuthSession): void {
  if (session.role === "owner") {
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

export function assertCanSubmitCloseRequest(session: AuthSession): void {
  if (!canSubmitCloseRequest(session.role)) {
    throw new ApiError("You do not have permission to submit a closing request.", {
      status: 403,
      code: "forbidden",
    });
  }
}

export function assertCanApproveAndClose(session: AuthSession): void {
  if (!canApproveAndClose(session.role)) {
    throw new ApiError("You do not have permission to approve and close the day.", {
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

export async function assertBranchDayNotClosedForWrite(
  branch: Branch,
  date: string
): Promise<void> {
  const state = await getBranchDayState(branch, date);

  if (state === "closed") {
    throw new ApiError("This branch day is closed. Records cannot be changed.", {
      status: 409,
      code: "day_closed",
    });
  }
}

export async function assertBranchDayOpenForWrite(
  branch: Branch,
  date: string
): Promise<void> {
  const state = await getBranchDayState(branch, date);

  await assertBranchDayNotClosedForWrite(branch, date);

  if (state === "close_requested") {
    throw new ApiError(
      "This business day has a pending closing request. Records cannot be changed.",
      {
        status: 409,
        code: "close_request_pending",
      }
    );
  }

  if (date === getTodayISO() && state !== "open") {
    throw new ApiError("Start today's shift before recording today's activity.", {
      status: 409,
      code: "shop_not_opened",
    });
  }
}

