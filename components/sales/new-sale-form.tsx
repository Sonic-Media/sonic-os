"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { Textarea } from "@/components/shared/ui/textarea";
import { TotalsField } from "@/components/shared/totals-grid";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useSales } from "@/context/sales-context";
import { useBranchSaleProducts } from "@/hooks/use-branch-sale-products";
import { resolveSaleBranch } from "@/lib/branch/access";
import { roleHasModuleAccess } from "@/lib/staff/permissions";
import { formatCurrency } from "@/lib/format";
import { computeSalePreview } from "@/lib/sales/calculations";
import { SALE_PAYMENT_METHODS } from "@/lib/sales/constants";
import { cn } from "@/lib/utils";
import type { SalePaymentMethod } from "@/types/sales";

export function NewSaleForm({
  inline = false,
  onSuccess,
}: {
  inline?: boolean;
  onSuccess?: () => void;
} = {}) {
  const router = useRouter();
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const saleBranch = resolveSaleBranch(session, activeBranch);
  const {
    products: availableProducts,
    isLoaded: productsLoaded,
    loadError: productsLoadError,
    refresh: refreshBranchProducts,
  } = useBranchSaleProducts(saleBranch, Boolean(session));
  const canAccessStock =
    session !== null && roleHasModuleAccess(session.role, "stock");
  const { customers, completeSale } = useSales();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = availableProducts.find(
    (product) => product.id === productId
  );

  const productOptions = useMemo(
    () =>
      availableProducts.map((product) => ({
        value: product.id,
        label: `${product.name} (${product.branchStock.toLocaleString("en-UG")} in stock)`,
      })),
    [availableProducts]
  );

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customers]
  );

  const paymentOptions = SALE_PAYMENT_METHODS.map((method) => ({
    value: method.id,
    label: method.label,
  }));

  const parsedQuantity = Number.parseInt(quantity, 10);
  const parsedUnitPrice = Number.parseFloat(unitPrice);
  const parsedDiscount = discount.trim() ? Number.parseFloat(discount) : 0;

  const preview = useMemo(() => {
    if (
      !selectedProduct ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      !Number.isFinite(parsedUnitPrice) ||
      parsedUnitPrice <= 0
    ) {
      return null;
    }

    return computeSalePreview(
      parsedQuantity,
      parsedUnitPrice,
      selectedProduct.buyingPrice,
      Number.isFinite(parsedDiscount) ? parsedDiscount : 0
    );
  }, [selectedProduct, parsedQuantity, parsedUnitPrice, parsedDiscount]);

  function handleProductChange(nextProductId: string) {
    setProductId(nextProductId);
    const product = availableProducts.find((item) => item.id === nextProductId);
    if (product) {
      setUnitPrice(String(product.sellingPrice));
    }
    setErrors((current) => ({
      ...current,
      productId: undefined,
      quantity: undefined,
      unitPrice: undefined,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProduct || isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    const result = await completeSale({
      productId,
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      discount: Number.isFinite(parsedDiscount) ? parsedDiscount : 0,
      customerId: customerId || undefined,
      paymentMethod: paymentMethod as SalePaymentMethod,
      branch: saleBranch,
      notes,
      branchStock: selectedProduct.branchStock,
      buyingPrice: selectedProduct.buyingPrice,
      productName: selectedProduct.name,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    if (onSuccess) {
      onSuccess();
      setProductId("");
      setQuantity("1");
      setUnitPrice("");
      setDiscount("");
      setCustomerId("");
      setPaymentMethod("");
      setNotes("");
      void refreshBranchProducts();
      return;
    }

    void refreshBranchProducts();
    router.push("/sales/history");
  }

  if (!productsLoaded) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">Loading products…</p>
      </Card>
    );
  }

  if (productsLoadError) {
    return (
      <Card>
        <p className="text-sm text-red-400">{productsLoadError}</p>
      </Card>
    );
  }

  if (availableProducts.length === 0) {
    const emptyMessage = canAccessStock
      ? inline
        ? "No accessory items are available to sell yet. Ask the owner to add stock."
        : "Add items to stock before recording sales."
      : "No products are currently available for sale.\nPlease contact your manager.";

    return (
      <Card>
        <p className="whitespace-pre-line text-sm text-zinc-400">{emptyMessage}</p>
        {!inline && canAccessStock && (
          <Button href="/stock/products" variant="secondary" className="mt-4">
            Go to Stock
          </Button>
        )}
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={
          inline
            ? "space-y-4"
            : "grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start"
        }
      >
        <Card className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {inline ? "New Accessory Sale" : "Sale Details"}
          </h2>

          {errors.form && (
            <p className="text-sm text-red-400">{errors.form}</p>
          )}

          <div>
            <Select
              label="Item"
              value={productId}
              placeholder="Select item"
              options={productOptions}
              onChange={(event) => handleProductChange(event.target.value)}
            />
            {errors.productId && (
              <p className="mt-1 text-xs text-red-400">{errors.productId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setErrors((current) => ({ ...current, quantity: undefined }));
                }}
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>
              )}
              {selectedProduct && (
                <p className="mt-1 text-xs text-zinc-500">
                  Available:{" "}
                  {selectedProduct.branchStock.toLocaleString("en-UG")}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Selling Price"
                type="number"
                min="0"
                step="1"
                value={unitPrice}
                onChange={(event) => {
                  setUnitPrice(event.target.value);
                  setErrors((current) => ({ ...current, unitPrice: undefined }));
                }}
                placeholder="0"
              />
              {errors.unitPrice && (
                <p className="mt-1 text-xs text-red-400">{errors.unitPrice}</p>
              )}
            </div>
          </div>

          <div>
            <Input
              label="Discount (optional)"
              type="number"
              min="0"
              step="1"
              value={discount}
              onChange={(event) => {
                setDiscount(event.target.value);
                setErrors((current) => ({ ...current, discount: undefined }));
              }}
              placeholder="0"
            />
            {errors.discount && (
              <p className="mt-1 text-xs text-red-400">{errors.discount}</p>
            )}
          </div>

          <Select
            label="Customer (optional)"
            value={customerId}
            placeholder="Walk-in customer"
            options={customerOptions}
            onChange={(event) => setCustomerId(event.target.value)}
          />

          <div>
            <Select
              label="Payment Method"
              value={paymentMethod}
              placeholder="Select payment method"
              options={paymentOptions}
              onChange={(event) => {
                setPaymentMethod(event.target.value as SalePaymentMethod);
                setErrors((current) => ({
                  ...current,
                  paymentMethod: undefined,
                }));
              }}
            />
            {errors.paymentMethod && (
              <p className="mt-1 text-xs text-red-400">{errors.paymentMethod}</p>
            )}
          </div>

          <Textarea
            label="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Additional sale notes"
          />
        </Card>

        {!inline && (
        <Card className="lg:sticky lg:top-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Totals
          </h2>

          <div className="space-y-4">
            <TotalsField
              label="Subtotal"
              value={preview ? formatCurrency(preview.subtotal) : "—"}
            />
            <TotalsField
              label="Discount"
              value={preview ? formatCurrency(preview.discount) : "—"}
            />
            <TotalsField
              label="Final Total"
              value={preview ? formatCurrency(preview.total) : "—"}
              size="lg"
            />
            <TotalsField
              label="Profit"
              value={preview ? formatCurrency(preview.profit) : "—"}
              valueClassName={cn(
                preview && preview.profit >= 0
                  ? "text-emerald-400"
                  : preview
                    ? "text-red-400"
                    : undefined
              )}
            />
          </div>

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={isSubmitting || !productId || !paymentMethod}
          >
            Complete Sale
          </Button>
        </Card>
        )}

        {inline && (
          <Button
            type="submit"
            disabled={isSubmitting || !productId || !paymentMethod}
          >
            Complete Sale
          </Button>
        )}
      </div>
    </form>
  );
}
