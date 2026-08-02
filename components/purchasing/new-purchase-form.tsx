"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { Textarea } from "@/components/shared/ui/textarea";
import { TotalsField } from "@/components/shared/totals-grid";
import { BranchPicker } from "@/components/entry/branch-picker";
import { usePurchasing } from "@/context/purchasing-context";
import { useStaff } from "@/context/staff-context";
import { useStock } from "@/context/stock-context";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { computePurchaseTotals } from "@/lib/purchasing/calculations";
import {
  parsePositiveInteger,
  parsePositivePrice,
} from "@/lib/purchasing/validation";
import type { Branch } from "@/types";
import type { PurchaseDraftLineItem } from "@/types/purchasing";

function createDraftLineItem(productId = "", buyingPrice = ""): PurchaseDraftLineItem {
  return {
    id: crypto.randomUUID(),
    productId,
    quantity: "1",
    buyingPrice,
  };
}

export function NewPurchaseForm() {
  const router = useRouter();
  const { products } = useStock();
  const { suppliers, completePurchase } = usePurchasing();
  const { staff } = useStaff();

  const [supplierId, setSupplierId] = useState("");
  const [lineItems, setLineItems] = useState<PurchaseDraftLineItem[]>([
    createDraftLineItem(),
  ]);
  const [staffId, setStaffId] = useState("");
  const [branch, setBranch] = useState<Branch>(DEFAULT_BRANCH_CODE);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliers]
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: product.name,
      })),
    [products]
  );

  const staffOptions = useMemo(
    () =>
      staff
        .filter((member) => member.active)
        .map((member) => ({
          value: member.id,
          label: member.name,
        })),
    [staff]
  );

  const parsedItems = useMemo(
    () =>
      lineItems
        .map((line) => {
          const quantity = parsePositiveInteger(line.quantity);
          const buyingPrice = parsePositivePrice(line.buyingPrice);
          if (!line.productId || quantity === null || buyingPrice === null) {
            return null;
          }
          return {
            productId: line.productId,
            quantity,
            buyingPrice,
          };
        })
        .filter(
          (
            item
          ): item is {
            productId: string;
            quantity: number;
            buyingPrice: number;
          } => item !== null
        ),
    [lineItems]
  );

  const totals = useMemo(
    () =>
      parsedItems.length > 0
        ? computePurchaseTotals(parsedItems)
        : { lineSubtotals: [], grandTotal: 0 },
    [parsedItems]
  );

  function updateLineItem(
    id: string,
    patch: Partial<PurchaseDraftLineItem>
  ) {
    setLineItems((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  }

  function handleProductChange(lineId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateLineItem(lineId, {
      productId,
      buyingPrice: product ? String(product.buyingPrice) : "",
    });
    setErrors((current) => ({ ...current, items: undefined }));
  }

  function addLineItem() {
    setLineItems((current) => [...current, createDraftLineItem()]);
  }

  function removeLineItem(id: string) {
    setLineItems((current) =>
      current.length > 1 ? current.filter((line) => line.id !== id) : current
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = completePurchase({
      supplierId,
      items: parsedItems,
      branch,
      staffId: staffId || undefined,
      notes,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    router.push("/purchasing/history");
  }

  if (suppliers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">
          Add a supplier before recording purchases.
        </p>
        <Button href="/purchasing/suppliers" variant="secondary" className="mt-4">
          Go to Suppliers
        </Button>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">
          Add products to stock before recording purchases.
        </p>
        <Button href="/stock/products" variant="secondary" className="mt-4">
          Go to Stock
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Purchase Details
            </h2>

            <div>
              <Select
                label="Supplier"
                value={supplierId}
                placeholder="Select supplier"
                options={supplierOptions}
                onChange={(event) => {
                  setSupplierId(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    supplierId: undefined,
                  }));
                }}
              />
              {errors.supplierId && (
                <p className="mt-1 text-xs text-red-400">{errors.supplierId}</p>
              )}
            </div>

            <BranchPicker
              value={branch}
              onChange={(nextBranch) => {
                setBranch(nextBranch);
                setErrors((current) => ({ ...current, branch: undefined }));
              }}
            />
            {errors.branch && (
              <p className="text-xs text-red-400">{errors.branch}</p>
            )}

            <Select
              label="Staff (optional)"
              value={staffId}
              placeholder="Select staff"
              options={staffOptions}
              onChange={(event) => setStaffId(event.target.value)}
            />

            <Textarea
              label="Notes (optional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional purchase notes"
            />
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Products
              </h2>
              <Button type="button" variant="secondary" onClick={addLineItem}>
                Add Product
              </Button>
            </div>

            {errors.items && (
              <p className="text-xs text-red-400">{errors.items}</p>
            )}

            <div className="space-y-4">
              {lineItems.map((line, index) => (
                <div
                  key={line.id}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">
                      Item {index + 1}
                    </p>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-3 text-red-400 hover:text-red-300"
                        onClick={() => removeLineItem(line.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <Select
                    label="Product"
                    value={line.productId}
                    placeholder="Select product"
                    options={productOptions}
                    onChange={(event) =>
                      handleProductChange(line.id, event.target.value)
                    }
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLineItem(line.id, { quantity: event.target.value })
                      }
                    />
                    <Input
                      label="Buying Price"
                      type="number"
                      min="0"
                      step="1"
                      value={line.buyingPrice}
                      onChange={(event) =>
                        updateLineItem(line.id, {
                          buyingPrice: event.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  {parsedItems[index] && (
                    <p className="text-xs text-zinc-500">
                      Subtotal:{" "}
                      {formatCurrency(totals.lineSubtotals[index] ?? 0)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Totals
          </h2>

          <TotalsField
            label="Grand Total"
            value={formatCurrency(totals.grandTotal)}
            size="lg"
          />

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={isSubmitting || !supplierId || parsedItems.length === 0}
          >
            Save Purchase
          </Button>
        </Card>
      </div>
    </form>
  );
}
