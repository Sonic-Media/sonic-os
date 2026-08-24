"use client";

import { OperationsOnlyGate } from "@/components/shared/operations-only-gate";

export default function NewPurchasePage() {
  return (
    <OperationsOnlyGate
      title="Purchases are recorded in Today's Operations"
      description="Supplier purchases should be logged during Today's Operations so stock, cash flow, and purchasing history stay aligned."
    />
  );
}
