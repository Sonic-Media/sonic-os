import type { DayClosingStaffPayout } from "@/types/day-closing";
import type {
  StaffPaymentInput,
  StaffPaymentValidationResult,
} from "@/types/staff-payment";

export type RecordStaffPaymentAsync = (
  input: StaffPaymentInput
) => Promise<StaffPaymentValidationResult>;

/**
 * Persists every selected close-day staff payout before day close proceeds.
 * Returns on the first failure so callers do not continue to close the day.
 */
export async function persistCloseDayStaffPayouts(
  payouts: DayClosingStaffPayout[],
  date: string,
  recordPayment: RecordStaffPaymentAsync
): Promise<{ success: true } | { success: false; message: string }> {
  const selectedPayouts = payouts.filter(
    (payout) => payout.selected && payout.amount > 0
  );

  for (const payout of selectedPayouts) {
    const paymentResult = await recordPayment({
      staffId: payout.staffId,
      amount: payout.amount,
      date,
      paymentType: "daily-wage",
      paymentMethod: "cash",
      notes: payout.notes?.trim() || "End of day payout",
    });

    if (!paymentResult.success) {
      return {
        success: false,
        message:
          paymentResult.errors.form ?? `Unable to pay ${payout.staffName}.`,
      };
    }
  }

  return { success: true };
}
