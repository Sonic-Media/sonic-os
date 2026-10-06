"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { fetchFinancialCorrections } from "@/lib/api/financial-corrections";
import { formatCurrency } from "@/lib/format";
import type { FinancialCorrectionRecord } from "@/types/financial-correction";

export function ExpenseCorrectionHistory({
  expenseId,
}: {
  expenseId: string;
}) {
  const { session } = useAuth();
  const [items, setItems] = useState<FinancialCorrectionRecord[]>([]);

  useEffect(() => {
    if (session?.role !== "owner") return;
    void fetchFinancialCorrections({
      sourceId: expenseId,
      sourceType: "expense_record",
    })
      .then(setItems)
      .catch(() => setItems([]));
  }, [expenseId, session?.role]);

  if (session?.role !== "owner" || items.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/[0.06] bg-black/20 p-5">
      <h3 className="text-sm font-semibold text-white">Correction history</h3>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="text-sm text-zinc-400">
            <p className="text-zinc-200">
              {formatCurrency(item.originalAmount ?? 0)} → {formatCurrency(item.newAmount ?? 0)}
            </p>
            <p className="mt-1">
              {item.actorName} · {new Date(item.createdAt).toLocaleString("en-UG")} · {item.branchCode} · {item.businessDate}
            </p>
            <p className="mt-1">{item.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
