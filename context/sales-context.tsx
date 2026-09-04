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
import {
  createCustomerApi,
  deleteCustomerApi,
  fetchCustomers,
  updateCustomerApi,
} from "@/lib/api/customers";
import { createSaleApi, fetchSales } from "@/lib/api/sales";
import { useAuth } from "@/context/auth-context";
import { useBranch } from "@/context/branch-context";
import { roleHasModuleAccess } from "@/lib/staff/permissions";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { formatEntryTime, getTodayISO } from "@/lib/dates";
import {
  normalizeCustomerList,
  normalizeSaleList,
  sortCustomersByName,
  sortSalesByDate,
} from "@/lib/sales-storage";
import {
  computeSalesDashboardMetrics,
  computeSalePreview,
} from "@/lib/sales/calculations";
import {
  hasValidationErrors,
  validateCustomerInput,
  validateSaleInput,
} from "@/lib/sales/validation";
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
  isBranchDayOpened,
  SHOP_NOT_OPENED_MESSAGE,
} from "@/lib/day-closing/storage";
import type {
  Customer,
  CustomerInput,
  CustomerUpdateInput,
  Sale,
  SaleInput,
  SalesDashboardMetrics,
  SaleValidationResult,
} from "@/types/sales";

interface SalesContextValue {
  sales: Sale[];
  customers: Customer[];
  metrics: SalesDashboardMetrics;
  isLoaded: boolean;
  loadError: string | null;
  refreshSales: () => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (input: CustomerInput) => SaleValidationResult;
  updateCustomer: (
    id: string,
    input: CustomerUpdateInput
  ) => SaleValidationResult;
  deleteCustomer: (id: string) => SaleValidationResult;
  completeSale: (input: SaleInput) => Promise<SaleValidationResult>;
}

const SalesContext = createContext<SalesContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>,
  sale?: Sale
): SaleValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
    sale,
  };
}

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded, session } = useAuth();
  const { activeBranch } = useBranch();
  const { getProductById, refreshStockFromApi, getBranchProductStock } = useStock();
  const canAccessStockModule =
    session !== null && roleHasModuleAccess(session.role, "stock");

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const lastFetchedBranch = useRef<string | null>(null);
  const saleInFlight = useRef(false);
  const salesRef = useRef(sales);
  const customersRef = useRef(customers);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  const refreshSalesFromApi = useCallback(async () => {
    const [remoteSales, remoteCustomers] = await Promise.all([
      fetchSales(),
      fetchCustomers(),
    ]);

    salesRef.current = normalizeSaleList(remoteSales);
    customersRef.current = normalizeCustomerList(remoteCustomers);
    setSales(salesRef.current);
    setCustomers(customersRef.current);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (!isAuthenticated) {
      salesRef.current = [];
      customersRef.current = [];
      setSales([]);
      setCustomers([]);
      setLoadError(null);
      hasLoaded.current = false;
      lastFetchedBranch.current = null;
      setIsLoaded(true);
      return;
    }

    if (hasLoaded.current && lastFetchedBranch.current === activeBranch) {
      return;
    }

    hasLoaded.current = true;
    lastFetchedBranch.current = activeBranch;

    queueMicrotask(() => {
      void (async () => {
        try {
          const loaded = await loadFromApi(async () => {
            const [remoteSales, remoteCustomers] = await Promise.all([
              fetchSales(),
              fetchCustomers(),
            ]);

            return {
              sales: sortSalesByDate(remoteSales),
              customers: sortCustomersByName(remoteCustomers),
            };
          });

          salesRef.current = normalizeSaleList(loaded.sales);
          customersRef.current = normalizeCustomerList(loaded.customers);
          setSales(salesRef.current);
          setCustomers(customersRef.current);
          setLoadError(null);
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, activeBranch]);

  const customerLookup = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const getCustomerById = useCallback(
    (id: string) => customerLookup.get(id),
    [customerLookup]
  );

  const metrics = useMemo(
    () => computeSalesDashboardMetrics(sales, getTodayISO()),
    [sales]
  );

  const addCustomer = useCallback(
    (input: CustomerInput): SaleValidationResult => {
      const errors = validateCustomerInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await createCustomerApi(input);
            await refreshSalesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshSalesFromApi]
  );

  const updateCustomer = useCallback(
    (id: string, input: CustomerUpdateInput): SaleValidationResult => {
      const existing = customersRef.current.find(
        (customer) => customer.id === id
      );
      if (!existing) {
        return createValidationResult({ form: "Customer not found." });
      }

      const errors = validateCustomerInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await updateCustomerApi(id, input);
            await refreshSalesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshSalesFromApi]
  );

  const deleteCustomer = useCallback(
    (id: string): SaleValidationResult => {
      const inUse = salesRef.current.some((sale) => sale.customerId === id);
      if (inUse) {
        return createValidationResult({
          form: "Cannot delete a customer that has sales records.",
        });
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await deleteCustomerApi(id);
            await refreshSalesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshSalesFromApi]
  );

  const completeSale = useCallback(
    async (input: SaleInput): Promise<SaleValidationResult> => {
      if (saleInFlight.current) {
        return createValidationResult({
          form: "A sale is already being processed. Please wait.",
        });
      }

      const product = getProductById(input.productId);
      const buyingPrice = product?.buyingPrice ?? input.buyingPrice;
      const productName = product?.name ?? input.productName;

      if (!buyingPrice || !productName) {
        return createValidationResult({ productId: "Item not found." });
      }

      const availableStock =
        input.branchStock ??
        (product
          ? getBranchProductStock(input.productId, input.branch)
          : 0);

      const errors = validateSaleInput(input, availableStock);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const dateISO = getTodayISO();
      if (isBranchDayClosed(input.branch, dateISO)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }
      if (!isBranchDayOpened(input.branch, dateISO)) {
        return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
      }

      const discount = input.discount ?? 0;
      const preview = computeSalePreview(
        input.quantity,
        input.unitPrice,
        buyingPrice,
        discount
      );

      const now = new Date();
      const customer = input.customerId
        ? getCustomerById(input.customerId)
        : undefined;
      const actor = resolveCurrentStaffAction(input.branch);
      const legacy = legacyStaffFields(actor);

      const lineItem = {
        productId: input.productId,
        productName,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        buyingPrice,
        lineTotal: preview.subtotal,
      };

      const sale: Sale = {
        id: crypto.randomUUID(),
        invoiceNumber: "",
        date: dateISO,
        time: formatEntryTime(now),
        customerId: customer?.id,
        customerName: customer?.name,
        items: [lineItem],
        subtotal: preview.subtotal,
        discount: preview.discount,
        total: preview.total,
        profit: preview.profit,
        paymentMethod: input.paymentMethod,
        branch: input.branch,
        staffId: legacy.staffId,
        staffName: legacy.staffName,
        createdBy: actor,
        completedBy: actor,
        notes: input.notes?.trim() || undefined,
        status: "completed",
        createdAt: now.toISOString(),
      };

      saleInFlight.current = true;

      try {
        const saved = await runOnApi(async () => {
          const created = await createSaleApi(sale);
          await refreshSalesFromApi();
          if (canAccessStockModule) {
            await refreshStockFromApi();
          }

          recordStaffAction({
            staffId: actor?.staffId,
            staffName: actor?.staffName,
            role: actor?.role,
            branch: input.branch,
            action: AUDIT_ACTIONS.COMPLETE_SALE,
            module: "sales",
            recordId: created.id,
            newValues: pickAuditFields(created, [
              "id",
              "invoiceNumber",
              "total",
              "profit",
              "branch",
              "paymentMethod",
            ]),
          });

          return created;
        });

        return createValidationResult({}, saved);
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      } finally {
        saleInFlight.current = false;
      }
    },
    [canAccessStockModule, getBranchProductStock, getCustomerById, refreshSalesFromApi, refreshStockFromApi]
  );

  const value = useMemo(
    () => ({
      sales,
      customers,
      metrics,
      isLoaded,
      loadError,
      refreshSales: refreshSalesFromApi,
      getCustomerById,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      completeSale,
    }),
    [
      sales,
      customers,
      metrics,
      isLoaded,
      loadError,
      refreshSalesFromApi,
      getCustomerById,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      completeSale,
    ]
  );

  return (
    <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
}
