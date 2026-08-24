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
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { getTodayISO } from "@/lib/dates";
import {
  normalizePurchaseList,
  normalizeSupplierList,
  sortPurchasesByDate,
  sortSuppliersByName,
} from "@/lib/purchasing-storage";
import {
  computeLineSubtotal,
  computePurchasingDashboardMetrics,
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
import { resolveCurrentStaffAction } from "@/lib/staff/session";
import { useAuth } from "@/context/auth-context";
import {
  DAY_CLOSED_EDIT_MESSAGE,
  isBranchDayClosed,
  isBranchDayOpened,
  SHOP_NOT_OPENED_MESSAGE,
} from "@/lib/day-closing/storage";
import { ownerExemptFromShopOpenGate } from "@/lib/operations/opening-hours";
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
  loadError: string | null;
  getPurchaseById: (id: string) => Purchase | undefined;
  getSupplierById: (id: string) => Supplier | undefined;
  addSupplier: (input: SupplierInput) => PurchaseValidationResult;
  updateSupplier: (
    id: string,
    input: SupplierUpdateInput
  ) => PurchaseValidationResult;
  deleteSupplier: (id: string) => PurchaseValidationResult;
  completePurchase: (input: PurchaseInput) => Promise<PurchaseValidationResult>;
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
  const { isAuthenticated, isLoaded: authLoaded, session } = useAuth();
  const { getProductById, refreshStockFromApi } = useStock();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const purchaseInFlight = useRef(false);
  const purchasesRef = useRef(purchases);
  const suppliersRef = useRef(suppliers);

  useEffect(() => {
    purchasesRef.current = purchases;
  }, [purchases]);

  useEffect(() => {
    suppliersRef.current = suppliers;
  }, [suppliers]);

  const refreshPurchasesFromApi = useCallback(async () => {
    const [remotePurchases, remoteSuppliers] = await Promise.all([
      fetchPurchases(),
      fetchSuppliers(),
    ]);

    purchasesRef.current = sortPurchasesByDate(remotePurchases);
    suppliersRef.current = sortSuppliersByName(remoteSuppliers);
    setPurchases(purchasesRef.current);
    setSuppliers(suppliersRef.current);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (!isAuthenticated) {
      purchasesRef.current = [];
      suppliersRef.current = [];
      setPurchases([]);
      setSuppliers([]);
      setLoadError(null);
      hasLoaded.current = false;
      setIsLoaded(true);
      return;
    }

    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          const loaded = await loadFromApi(async () => {
            const [remotePurchases, remoteSuppliers] = await Promise.all([
              fetchPurchases(),
              fetchSuppliers(),
            ]);

            return {
              purchases: sortPurchasesByDate(remotePurchases),
              suppliers: sortSuppliersByName(remoteSuppliers),
            };
          });

          purchasesRef.current = normalizePurchaseList(loaded.purchases);
          suppliersRef.current = normalizeSupplierList(loaded.suppliers);
          setPurchases(purchasesRef.current);
          setSuppliers(suppliersRef.current);
          setLoadError(null);
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated]);

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
        try {
          await runOnApi(async () => {
            await createSupplierApi(input);
            await refreshPurchasesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshPurchasesFromApi]
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
        try {
          await runOnApi(async () => {
            await updateSupplierApi(id, input);
            await refreshPurchasesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshPurchasesFromApi]
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
        try {
          await runOnApi(async () => {
            await deleteSupplierApi(id);
            await refreshPurchasesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshPurchasesFromApi]
  );

  const completePurchase = useCallback(
    async (input: PurchaseInput): Promise<PurchaseValidationResult> => {
      if (purchaseInFlight.current) {
        return createValidationResult({
          form: "A purchase is already being processed. Please wait.",
        });
      }

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
      if (
        !ownerExemptFromShopOpenGate(session?.role) &&
        !isBranchDayOpened(input.branch, dateISO)
      ) {
        return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
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

      const actor = resolveCurrentStaffAction(input.branch);

      purchaseInFlight.current = true;

      try {
        await runOnApi(async () => {
          const created = await createPurchaseApi({
            ...normalizedInput,
            createdBy: actor,
          } as PurchaseInput);
          await refreshPurchasesFromApi();
          await refreshStockFromApi();

          recordStaffAction({
            staffId: actor?.staffId,
            staffName: actor?.staffName,
            role: actor?.role,
            branch: input.branch,
            action: AUDIT_ACTIONS.COMPLETE_PURCHASE,
            module: "purchasing",
            recordId: created.id,
            newValues: pickAuditFields(created, [
              "id",
              "invoiceNumber",
              "totalCost",
              "branch",
              "supplierName",
            ]),
          });
        });

        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      } finally {
        purchaseInFlight.current = false;
      }
    },
    [getSupplierById, getProductById, refreshPurchasesFromApi, refreshStockFromApi, session?.role]
  );

  const value = useMemo(
    () => ({
      purchases,
      suppliers,
      metrics,
      isLoaded,
      loadError,
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
      loadError,
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
