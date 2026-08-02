import Link from "next/link";
import { PurchasingEmptyState } from "@/components/purchasing/purchasing-empty-state";
import { Card } from "@/components/shared/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Purchase } from "@/types/purchasing";

interface OwnerPendingPurchasesProps {
  purchases: Purchase[];
}

export function OwnerPendingPurchases({ purchases }: OwnerPendingPurchasesProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Pending Purchases
      </h2>

      {purchases.length === 0 ? (
        <PurchasingEmptyState message="No purchases recorded today." />
      ) : (
        <div className="space-y-2">
          {purchases.map((purchase) => (
            <Link key={purchase.id} href={`/purchasing/${purchase.id}`}>
              <Card className="flex flex-col gap-2 py-4 transition-colors hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {purchase.invoiceNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {purchase.supplierName}
                    {purchase.staffName ? ` · ${purchase.staffName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {purchase.items.length} item
                    {purchase.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(purchase.totalCost)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
