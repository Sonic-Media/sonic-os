"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStock } from "@/context/stock-context";
import { createPurchaseApi, fetchPurchases } from "@/lib/api/purchases";
import {
  createSupplierApi,
  deleteSupplierApi,
  fetchSuppliers,
  updateSupplierApi,
} from "@/lib/api/suppliers";
import {
  loadRemoteOrLocal,
  runRemoteOrLocal,
  shouldUseRemoteDataSource,
} from "@/lib/data-source/context-api";
import { getTodayISO } from "@/lib/dates";
import {
  getPurchases,
  getSuppliers,
  normalizePurchaseList,
  normalizeSupplierList,
  savePurchases,
  saveSuppliers,
  sortPurchasesByDate,
  sortSuppliersByName,
} from "@/lib/purchasing-storage";
import {
  computeLineSubtotal,
  computePurchasingDashboardMetrics,
  computeWeightedAverageBuyingPrice,
  generatePurchaseInvoiceNumber,
  mergePurchaseLineItems,
} from "@/lib/purchasing/calculations";
import {
  hasValidationErrors,
  validatePurchaseInput,
  validateSupplierInput,
} from "@/lib/purchasing/validation";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction } from "@/lib/staff/audit";
import {
  legacyStaffFields,
  resolveCurrentStaffAction,
} from "@/lib/staff/session";
import {
  DAY_CLOSED_EDIT_MESSAGE,
  isBranchDayClosed,
} from "@/lib/day-closing/storage";
import type {
  Purchase,
  PurchaseInput,
  PurchaseValidationResult,
  PurchasingDashboardMetrics,
  Supplier,
  SupplierInput,
  SupplierUpdateInput,
} from "@/types/purchasing";

interface PurchasingContextValue {
  purchases: Purchase[];
  suppliers: Supplier[];
  metrics: PurchasingDashboardMetrics;
  isLoaded: boolean;
  getPurchaseById: (id: string) => Purchase | undefined;
  getSupplierById: (id: string) => Supplier | undefined;
  addSupplier: (input: SupplierInput) => PurchaseValidationResult;
  updateSupplier: (
    id: string,
    input: SupplierUpdateInput
  ) => PurchaseValidationResult;
  deleteSupplier: (id: string) => PurchaseValidationResult;
  completePurchase: (input: PurchaseInput) => PurchaseValidationResult;
}

const PurchasingContext = createContext<PurchasingContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>
): PurchaseValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
  };
}

export function PurchasingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    getProductById,
    recordMovement,
    updateProduct,
    getStockSnapshot,
    restoreStockSnapshot,
    refreshStockFromApi,
  } = useStock();

  const [purchases, setPurchases] = useState<Purchase[]>(() => getPurchases());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const purchasesRef = useRef(purchases);
  const suppliersRef = useRef(suppliers);

  useEffect(() => {
    purchasesRef.current = purchases;
  }, [purchases]);

  useEffect(() => {
    suppliersRef.current = suppliers;
  }, [suppliers]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        const loaded = await loadRemoteOrLocal({
          remote: async () => {
            const [remotePurchases, remoteSuppliers] = await Promise.all([
              fetchPurchases(),
              fetchSuppliers(),
            ]);

            return {
              purchases: sortPurchasesByDate(remotePurchases),
              suppliers: sortSuppliersByName(remoteSuppliers),
            };
          },
          local: () => ({
            purchases: getPurchases(),
            suppliers: getSuppliers(),
          }),
        });

        purchasesRef.current = normalizePurchaseList(loaded.purchases);
        suppliersRef.current = normalizeSupplierList(loaded.suppliers);
        setPurchases(purchasesRef.current);
        setSuppliers(suppliersRef.current);
        setIsLoaded(true);
      })();
    });
  }, []);

  const persistPurchases = useCallback((next: Purchase[]) => {
    const normalized = sortPurchasesByDate(normalizePurchaseList(next));
    savePurchases(normalized);
    purchasesRef.current = normalized;
    setPurchases(normalized);
  }, []);

  const persistSuppliers = useCallback((next: Supplier[]) => {
    const normalized = sortSuppliersByName(normalizeSupplierList(next));
    saveSuppliers(normalized);
    suppliersRef.current = normalized;
    setSuppliers(normalized);
  }, []);

  const refreshPurchasesFromApi = useCallback(async () => {
    if (!(await shouldUseRemoteDataSource())) {
      return;
    }

    const [remotePurchases, remoteSuppliers] = await Promise.all([
      fetchPurchases(),
      fetchSuppliers(),
    ]);

    purchasesRef.current = sortPurchasesByDate(remotePurchases);
    suppliersRef.current = sortSuppliersByName(remoteSuppliers);
    setPurchases(purchasesRef.current);
    setSuppliers(suppliersRef.current);
  }, []);

  const purchaseLookup = useMemo(
    () => new Map(purchases.map((purchase) => [purchase.id, purchase])),
    [purchases]
  );

  const supplierLookup = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers]
  );

  const getPurchaseById = useCallback(
    (id: string) => purchaseLookup.get(id),
    [purchaseLookup]
  );

  const getSupplierById = useCallback(
    (id: string) => supplierLookup.get(id),
    [supplierLookup]
  );

  const metrics = useMemo(
    () => computePurchasingDashboardMetrics(purchases, getTodayISO()),
    [purchases]
  );

  const addSupplier = useCallback(
    (input: SupplierInput): PurchaseValidationResult => {
      const errors = validateSupplierInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await createSupplierApi(input);
            await refreshPurchasesFromApi();
          },
          local: () => {
            const now = new Date().toISOString();
            const supplier: Supplier = {
              id: crypto.randomUUID(),
              name: input.name.trim(),
              phone: input.phone?.trim() || undefined,
              email: input.email?.trim() || undefined,
              address: input.address?.trim() || undefined,
              notes: input.notes?.trim() || undefined,
              createdAt: now,
              updatedAt: now,
            };

            persistSuppliers([...suppliersRef.current, supplier]);
            recordStaffAction({
              action: AUDIT_ACTIONS.CREATE,
              module: "purchasing",
              recordId: supplier.id,
              newValues: pickAuditFields(supplier, ["id", "name", "phone", "email"]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistSuppliers, refreshPurchasesFromApi]
  );

  const updateSupplier = useCallback(
    (id: string, input: SupplierUpdateInput): PurchaseValidationResult => {
      const existing = suppliersRef.current.find(
        (supplier) => supplier.id === id
      );
      if (!existing) {
        return createValidationResult({ form: "Supplier not found." });
      }

      const errors = validateSupplierInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await updateSupplierApi(id, input);
            await refreshPurchasesFromApi();
          },
          local: () => {
            const now = new Date().toISOString();
            const nextSuppliers = suppliersRef.current.map((supplier) =>
              supplier.id === id
                ? {
                    ...supplier,
                    name: input.name.trim(),
                    phone: input.phone?.trim() || undefined,
                    email: input.email?.trim() || undefined,
                    address: input.address?.trim() || undefined,
                    notes: input.notes?.trim() || undefined,
                    updatedAt: now,
                  }
                : supplier
            );

            persistSuppliers(nextSuppliers);

            const renamed = existing.name !== input.name.trim();
            if (renamed) {
              const nextPurchases = purchasesRef.current.map((purchase) =>
                purchase.supplierId === id
                  ? { ...purchase, supplierName: input.name.trim() }
                  : purchase
              );
              persistPurchases(nextPurchases);
            }

            recordStaffAction({
              action: AUDIT_ACTIONS.EDIT,
              module: "purchasing",
              recordId: existing.id,
              oldValues: pickAuditFields(existing, ["name", "phone", "email"]),
              newValues: pickAuditFields(
                {
                  name: input.name.trim(),
                  phone: input.phone?.trim(),
                  email: input.email?.trim(),
                },
                ["name", "phone", "email"]
              ),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistSuppliers, persistPurchases, refreshPurchasesFromApi]
  );

  const deleteSupplier = useCallback(
    (id: string): PurchaseValidationResult => {
      const inUse = purchasesRef.current.some(
        (purchase) => purchase.supplierId === id
      );
      if (inUse) {
        return createValidationResult({
          form: "Cannot delete a supplier that has purchase records.",
        });
      }

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await deleteSupplierApi(id);
            await refreshPurchasesFromApi();
          },
          local: () => {
            const existing = suppliersRef.current.find(
              (supplier) => supplier.id === id
            );
            if (existing) {
              recordStaffAction({
                action: AUDIT_ACTIONS.DELETE,
                module: "purchasing",
                recordId: existing.id,
                oldValues: pickAuditFields(existing, ["id", "name"]),
              });
            }

            persistSuppliers(
              suppliersRef.current.filter((supplier) => supplier.id !== id)
            );
          },
        });
      })();

      return createValidationResult({});
    },
    [persistSuppliers, refreshPurchasesFromApi]
  );

  const completePurchase = useCallback(
    (input: PurchaseInput): PurchaseValidationResult => {
      const supplier = getSupplierById(input.supplierId);
      if (!supplier) {
        return createValidationResult({ supplierId: "Supplier not found." });
      }

      const mergedItems = mergePurchaseLineItems(input.items);
      const normalizedInput = { ...input, items: mergedItems };
      const errors = validatePurchaseInput(normalizedInput);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const dateISO = input.date ?? getTodayISO();
      if (isBranchDayClosed(input.branch, dateISO)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }

      const lineItems = mergedItems.map((item) => {
        const product = getProductById(item.productId);
        if (!product) {
          return null;
        }

        return {
          item,
          product,
          lineTotal: computeLineSubtotal(item.quantity, item.buyingPrice),
        };
      });

      if (lineItems.some((entry) => entry === null)) {
        return createValidationResult({ items: "One or more items not found." });
      }

      const resolvedItems = lineItems.filter(
        (
          entry
        ): entry is {
          item: (typeof mergedItems)[number];
          product: NonNullable<ReturnType<typeof getProductById>>;
          lineTotal: number;
        } => entry !== null
      );

      const actor = resolveCurrentStaffAction(input.branch);

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await createPurchaseApi({
              ...normalizedInput,
              createdBy: actor,
            } as PurchaseInput);
            await refreshPurchasesFromApi();
            await refreshStockFromApi();
          },
          local: () => {
            const invoiceNumber = generatePurchaseInvoiceNumber(
              purchasesRef.current,
              dateISO
            );
            const stockSnapshot = getStockSnapshot();

            for (const { item, product } of resolvedItems) {
              const movementResult = recordMovement({
                productId: product.id,
                movement: "in",
                quantity: item.quantity,
                reason: "Purchase",
                notes: `Purchase ${invoiceNumber}`,
                date: dateISO,
                branch: input.branch,
              });

              if (!movementResult.success) {
                restoreStockSnapshot(stockSnapshot);
                return;
              }

              const newBuyingPrice = computeWeightedAverageBuyingPrice(
                product.currentStock,
                product.buyingPrice,
                item.quantity,
                item.buyingPrice
              );

              const updateResult = updateProduct(product.id, {
                name: product.name,
                category: product.category,
                sku: product.sku,
                buyingPrice: newBuyingPrice,
                sellingPrice: product.sellingPrice,
                minimumStockLevel: product.minimumStockLevel,
                notes: product.notes,
              });

              if (!updateResult.success) {
                restoreStockSnapshot(stockSnapshot);
                return;
              }
            }

            const legacy = legacyStaffFields(actor);
            const totalCost = resolvedItems.reduce(
              (sum, entry) => sum + entry.lineTotal,
              0
            );

            const purchase: Purchase = {
              id: crypto.randomUUID(),
              invoiceNumber,
              date: dateISO,
              supplierId: supplier.id,
              supplierName: supplier.name,
              items: resolvedItems.map(({ item, product, lineTotal }) => ({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                buyingPrice: item.buyingPrice,
                lineTotal,
              })),
              totalCost,
              branch: input.branch,
              staffId: legacy.staffId,
              staffName: legacy.staffName,
              createdBy: actor,
              notes: input.notes?.trim() || undefined,
              createdAt: new Date().toISOString(),
            };

            persistPurchases([purchase, ...purchasesRef.current]);
            recordStaffAction({
              staffId: actor?.staffId,
              staffName: actor?.staffName,
              role: actor?.role,
              branch: input.branch,
              action: AUDIT_ACTIONS.COMPLETE_PURCHASE,
              module: "purchasing",
              recordId: purchase.id,
              newValues: pickAuditFields(purchase, [
                "id",
                "invoiceNumber",
                "totalCost",
                "branch",
                "supplierName",
              ]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [
      getSupplierById,
      getProductById,
      recordMovement,
      updateProduct,
      getStockSnapshot,
      restoreStockSnapshot,
      persistPurchases,
      refreshPurchasesFromApi,
      refreshStockFromApi,
    ]
  );

  const value = useMemo(
    () => ({
      purchases,
      suppliers,
      metrics,
      isLoaded,
      getPurchaseById,
      getSupplierById,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      completePurchase,
    }),
    [
      purchases,
      suppliers,
      metrics,
      isLoaded,
      getPurchaseById,
      getSupplierById,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      completePurchase,
    ]
  );

  return (
    <PurchasingContext.Provider value={value}>
      {children}
    </PurchasingContext.Provider>
  );
}

export function usePurchasing() {
  const context = useContext(PurchasingContext);
  if (!context) {
    throw new Error("usePurchasing must be used within a PurchasingProvider");
  }
  return context;
}
