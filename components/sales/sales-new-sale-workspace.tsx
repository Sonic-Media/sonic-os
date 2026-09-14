"use client";

import { useMemo, useState } from "react";
import { SalesCartPanel, type SalesCartLine } from "@/components/sales/sales-cart-panel";
import { SalesCatalogFilters } from "@/components/sales/sales-catalog-filters";
import { SalesProductGrid } from "@/components/sales/sales-product-grid";
import { Button } from "@/components/shared/ui/button";
import { EmptyState } from "@/components/shared/ui/empty-state";
import { useActiveBranch } from "@/context/active-branch-context";
import { useAuth } from "@/context/auth-context";
import { useSales } from "@/context/sales-context";
import { useStock } from "@/context/stock-context";
import { useBranchSaleProducts } from "@/hooks/use-branch-sale-products";
import { resolveSaleBranch } from "@/lib/branch/access";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { roleHasModuleAccess } from "@/lib/staff/permissions";
import {
  enrichBranchSaleProducts,
  filterSaleCatalogProducts,
  type SalesCatalogFilter,
  type SaleCatalogProduct,
} from "@/lib/sales/product-groups";
import { uiSurface } from "@/lib/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { SalePaymentMethod } from "@/types/sales";

interface SalesNewSaleWorkspaceProps {
  onSuccess?: () => void;
}

export function SalesNewSaleWorkspace({ onSuccess }: SalesNewSaleWorkspaceProps) {
  const { session } = useAuth();
  const { activeBranch } = useActiveBranch();
  const saleBranch = resolveSaleBranch(session, activeBranch);
  const { products: branchProducts, isLoaded, loadError, refresh } =
    useBranchSaleProducts(saleBranch, Boolean(session));
  const { products: stockProducts } = useStock();
  const { customers, completeSale } = useSales();
  const canAccessStock =
    session !== null && roleHasModuleAccess(session.role, "stock");

  const [catalogFilter, setCatalogFilter] = useState<SalesCatalogFilter>("all");
  const [search, setSearch] = useState("");
  const [cartLines, setCartLines] = useState<SalesCartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod | "">("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const catalogProducts = useMemo(() => {
    const branchStockProducts = stockProducts.filter((product) =>
      branchCodesReferToSameInventory(product.branch, saleBranch)
    );
    return enrichBranchSaleProducts(branchProducts, branchStockProducts);
  }, [branchProducts, saleBranch, stockProducts]);

  const filteredProducts = useMemo(
    () => filterSaleCatalogProducts(catalogProducts, catalogFilter, search),
    [catalogFilter, catalogProducts, search]
  );

  const customerOptions = useMemo(
    () => customers.map((customer) => ({ value: customer.id, label: customer.name })),
    [customers]
  );

  function addProductToCart(product: SaleCatalogProduct) {
    setCartLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
        },
      ];
    });
    setErrors({});
  }

  function updateQuantity(productId: string, quantity: number) {
    setCartLines((current) =>
      current.map((line) =>
        line.product.id === productId
          ? { ...line, quantity: Math.max(1, quantity) }
          : line
      )
    );
  }

  function removeLine(productId: string) {
    setCartLines((current) => current.filter((line) => line.product.id !== productId));
  }

  function clearCart() {
    setCartLines([]);
    setDiscount("");
    setNotes("");
    setCustomerId("");
    setPaymentMethod("");
    setErrors({});
  }

  async function handleSubmit() {
    if (cartLines.length === 0 || isSubmitting) return;

    if (!paymentMethod) {
      setErrors({ paymentMethod: "Select a payment method." });
      return;
    }

    const parsedDiscount = discount.trim() ? Number.parseFloat(discount) : 0;
    if (cartLines.length === 1 && Number.isFinite(parsedDiscount) && parsedDiscount < 0) {
      setErrors({ discount: "Discount cannot be negative." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    for (const [index, line] of cartLines.entries()) {
      const lineDiscount =
        cartLines.length === 1 && index === 0 && Number.isFinite(parsedDiscount)
          ? parsedDiscount
          : 0;

      const result = await completeSale({
        productId: line.product.id,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: lineDiscount,
        customerId: customerId || undefined,
        paymentMethod,
        branch: saleBranch,
        notes,
        branchStock: line.product.branchStock,
        buyingPrice: line.product.buyingPrice,
        productName: line.product.name,
      });

      if (!result.success) {
        setErrors({
          ...result.errors,
          form: result.errors.form,
          [`quantity:${line.product.id}`]: result.errors.quantity,
        });
        setIsSubmitting(false);
        return;
      }
    }

    clearCart();
    setIsSubmitting(false);
    void refresh();
    onSuccess?.();
  }

  if (!isLoaded) {
    return (
      <div className={cn(uiSurface.card, "p-6")}>
        <p className="text-sm text-zinc-400">Loading products…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn(uiSurface.card, "p-6")}>
        <p className="text-sm text-red-400">{loadError}</p>
      </div>
    );
  }

  if (catalogProducts.length === 0) {
    return (
      <div className={cn(uiSurface.card, "p-6")}>
        <EmptyState
          title="No accessories available."
          description={
            canAccessStock
              ? "Add items to stock before recording sales."
              : "Please contact your manager."
          }
        />
        {canAccessStock ? (
          <Button href="/stock/products" variant="secondary" className="mt-4">
            Go to Stock
          </Button>
        ) : null}
      </div>
    );
  }

  const moviesEmptyMessage =
    catalogFilter === "movies"
      ? "Movie revenue is recorded in Today's Operations, not as accessory products."
      : "No products match the current filters.";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">New Sale</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Select products, review the cart, and record the sale.
        </p>
      </div>

      <SalesCatalogFilters
        filter={catalogFilter}
        onFilterChange={setCatalogFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
        <SalesProductGrid
          products={filteredProducts}
          onSelect={addProductToCart}
          selectedProductId={cartLines[cartLines.length - 1]?.product.id}
          emptyMessage={moviesEmptyMessage}
        />
        <SalesCartPanel
          lines={cartLines}
          onQuantityChange={updateQuantity}
          onRemove={removeLine}
          onClear={clearCart}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          customerId={customerId}
          onCustomerChange={setCustomerId}
          customerOptions={customerOptions}
          discount={discount}
          onDiscountChange={setDiscount}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={() => void handleSubmit()}
          isSubmitting={isSubmitting}
          errors={errors}
        />
      </div>
    </section>
  );
}
