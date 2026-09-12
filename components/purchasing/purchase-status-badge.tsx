"use client";

import { Badge } from "@/components/shared/ui/badge";
import {
  getPurchaseDisplayStatus,
  getPurchaseDisplayStatusLabel,
} from "@/lib/purchasing/display-status";
import type { Purchase } from "@/types/purchasing";

interface PurchaseStatusBadgeProps {
  purchase: Purchase;
}

export function PurchaseStatusBadge({ purchase }: PurchaseStatusBadgeProps) {
  const status = getPurchaseDisplayStatus(purchase);

  return (
    <Badge tone={status === "received" ? "success" : "warning"}>
      {getPurchaseDisplayStatusLabel(status)}
    </Badge>
  );
}
