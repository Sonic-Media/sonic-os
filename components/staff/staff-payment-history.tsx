import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import {
  getExpensePaymentMethodLabel,
  getStaffPaymentTypeLabel,
} from "@/lib/expenses-module/constants";
import { getStaffRoleName } from "@/lib/staff/roles";
import { getEffectiveStaffPaymentAmount } from "@/lib/staff-payments/calculations";
import type { ExpenseRecord } from "@/types/expenses-module";

interface StaffPaymentHistoryProps {
  payments: ExpenseRecord[];
  emptyMessage?: string;
}

function formatPaymentDate(date: string): string {
  const parsed = new Date(date + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StaffPaymentHistory({
  payments,
  emptyMessage = "No staff payments recorded yet.",
}: StaffPaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <Card
          key={payment.id}
          className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium text-white">
              {payment.staffPaymentType
                ? getStaffPaymentTypeLabel(payment.staffPaymentType)
                : payment.description}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatPaymentDate(payment.date)} ·{" "}
              {getExpensePaymentMethodLabel(payment.paymentMethod)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {payment.staffRole
                ? getStaffRoleName(payment.staffRole)
                : "Staff Payment"}
              {payment.notes ? ` · ${payment.notes}` : ""}
            </p>
          </div>
          <p className="text-sm font-semibold text-white tabular-nums">
            {formatCurrency(getEffectiveStaffPaymentAmount(payment))}
          </p>
        </Card>
      ))}
    </div>
  );
}
