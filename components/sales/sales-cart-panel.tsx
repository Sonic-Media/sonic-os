"use client";

import { Button } from "@/components/shared/ui/button";
import { Select } from "@/components/shared/ui/select";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { computeSalePreview } from "@/lib/sales/calculations";
import { SALE_PAYMENT_METHODS } from "@/lib/sales/constants";
import type { SaleCatalogProduct } from "@/lib/sales/product-groups";
import type { SalePaymentMethod } from "@/types/sales";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";

export interface SalesCartLine {
  product: SaleCatalogProduct;
  quantity: number;
  unitPrice: number;
}

interface SalesCartPanelProps {
  lines: SalesCartLine[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  paymentMethod: SalePaymentMethod | "";
  onPaymentMethodChange: (method: SalePaymentMethod) => void;
  customerId: string;
  onCustomerChange: (customerId: string) => void;
  customerOptions: { value: string; label: string }[];
  discount: string;
  onDiscountChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Record<string, string | undefined>;
}

export function SalesCartPanel({
  lines,
  onQuantityChange,
  onRemove,
  onClear,
  paymentMethod,
  onPaymentMethodChange,
  customerId,
  onCustomerChange,
  customerOptions,
  discount,
  onDiscountChange,
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
  errors,
}: SalesCartPanelProps) {
  const parsedDiscount = discount.trim() ? Number.parseFloat(discount) : 0;
  const discountForLine =
    lines.length === 1 && Number.isFinite(parsedDiscount) ? parsedDiscount : 0;

  const cartTotal = lines.reduce((sum, line) => {
    const preview = computeSalePreview(
      line.quantity,
      line.unitPrice,
      line.product.buyingPrice,
      line === lines[0] ? discountForLine : 0
    );
    return sum + preview.total;
  }, 0);

  return (
    <div className={cn(uiSurface.card, "flex flex-col p-5")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Cart</h3>
        {lines.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-zinc-500">
            Select a product to add it to the cart.
          </p>
        ) : (
          lines.map((line) => {
            const lineSubtotal = line.quantity * line.unitPrice;
            const lineDiscount =
              line === lines[0] && lines.length === 1 ? discountForLine : 0;
            const preview = computeSalePreview(
              line.quantity,
              line.unitPrice,
              line.product.buyingPrice,
              lineDiscount
            );

            return (
              <div
                key={line.product.id}
                className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {line.product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatCurrency(line.unitPrice)} each
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.product.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={String(line.quantity)}
                    onChange={(event) =>
                      onQuantityChange(
                        line.product.id,
                        Number.parseInt(event.target.value, 10) || 1
                      )
                    }
                    className="h-10 w-24"
                  />
                  <p className="text-sm font-semibold tabular-nums text-white">
                    {formatCurrency(preview.total)}
                  </p>
                </div>
                {errors[`quantity:${line.product.id}`] ? (
                  <p className="mt-1 text-xs text-red-400">
                    {errors[`quantity:${line.product.id}`]}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {lines.length === 1 ? (
        <div className="mt-4">
          <Input
            label="Discount (optional)"
            type="number"
            min="0"
            step="1"
            value={discount}
            onChange={(event) => onDiscountChange(event.target.value)}
            placeholder="0"
          />
          {errors.discount ? (
            <p className="mt-1 text-xs text-red-400">{errors.discount}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <Select
          label="Customer (optional)"
          value={customerId}
          placeholder="Walk-in customer"
          options={customerOptions}
          onChange={(event) => onCustomerChange(event.target.value)}
        />
        <Select
          label="Payment Method"
          value={paymentMethod}
          placeholder="Select payment method"
          options={SALE_PAYMENT_METHODS.map((method) => ({
            value: method.id,
            label: method.label,
          }))}
          onChange={(event) =>
            onPaymentMethodChange(event.target.value as SalePaymentMethod)
          }
        />
        {errors.paymentMethod ? (
          <p className="text-xs text-red-400">{errors.paymentMethod}</p>
        ) : null}
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Additional sale notes"
        />
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Total
          </p>
          <p className="text-3xl font-bold tabular-nums text-white">
            {formatCurrency(cartTotal)}
          </p>
        </div>
        {errors.form ? (
          <p className="mt-2 text-sm text-red-400">{errors.form}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            onClick={onSubmit}
            loading={isSubmitting}
            loadingLabel="Recording sale..."
            disabled={isSubmitting || lines.length === 0 || !paymentMethod}
          >
            Record Sale
          </Button>
          <Button type="button" variant="secondary" onClick={onClear} disabled={isSubmitting}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
