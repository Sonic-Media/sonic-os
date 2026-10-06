"use client";

import { useCallback, useRef, useState } from "react";
import { useDayClosing } from "@/context/day-closing-context";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";

export function useManagementRejectClose() {
  const { rejectCloseRequest } = useDayClosing();
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rejectingRef = useRef(false);

  const rejectClose = useCallback(
    async (
      branch: Branch,
      date: string,
      reason: string
    ): Promise<{ success: boolean; record?: DayClosingRecord; message?: string }> => {
      if (rejectingRef.current || isRejecting) {
        return { success: false };
      }

      const trimmed = reason.trim();
      if (!trimmed) {
        const message = "A rejection reason is required.";
        setError(message);
        return { success: false, message };
      }

      rejectingRef.current = true;
      setIsRejecting(true);
      setError(null);

      const result = await rejectCloseRequest(branch, date, trimmed);

      setIsRejecting(false);
      rejectingRef.current = false;

      if (!result.success) {
        const message = result.errors.form ?? "Could not reject this closing request.";
        setError(message);
        return { success: false, message };
      }

      return { success: true, record: result.record };
    },
    [isRejecting, rejectCloseRequest]
  );

  return { rejectClose, isRejecting, error };
}
