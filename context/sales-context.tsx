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
import {
  loadRemoteOrLocal,
  runRemoteOrLocal,
  shouldUseRemoteDataSource,
} from "@/lib/data-source/context-api";
import { formatEntryTime, getTodayISO } from "@/lib/dates";
import {
  getCustomers,
  getSales,
  normalizeCustomerList,
  normalizeSaleList,
  saveCustomers,
  saveSales,
  sortCustomersByName,
  sortSalesByDate,
} from "@/lib/sales-storage";
import {
  computeSalesDashboardMetrics,
  computeSalePreview,
  generateInvoiceNumber,
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
import type { StockMovementInput } from "@/types/stock";

interface SalesContextValue {
  sales: Sale[];
  customers: Customer[];
  metrics: SalesDashboardMetrics;
  isLoaded: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (input: CustomerInput) => SaleValidationResult;
  updateCustomer: (
    id: string,
    input: CustomerUpdateInput
  ) => SaleValidationResult;
  deleteCustomer: (id: string) => SaleValidationResult;
  completeSale: (input: SaleInput) => SaleValidationResult;
}

const SalesContext = createContext<SalesContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>
): SaleValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
  };
}

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const { getProductById, recordMovement, refreshStockFromApi } = useStock();

  const [sales, setSales] = useState<Sale[]>(() => getSales());
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const salesRef = useRef(sales);
  const customersRef = useRef(customers);

  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        const loaded = await loadRemoteOrLocal({
          remote: async () => {
            const [remoteSales, remoteCustomers] = await Promise.all([
              fetchSales(),
              fetchCustomers(),
            ]);

            return {
              sales: sortSalesByDate(remoteSales),
              customers: sortCustomersByName(remoteCustomers),
            };
          },
          local: () => ({
            sales: getSales(),
            customers: getCustomers(),
          }),
        });

        salesRef.current = normalizeSaleList(loaded.sales);
        customersRef.current = normalizeCustomerList(loaded.customers);
        setSales(salesRef.current);
        setCustomers(customersRef.current);
        setIsLoaded(true);
      })();
    });
  }, []);

  const persistSales = useCallback((next: Sale[]) => {
    const normalized = sortSalesByDate(normalizeSaleList(next));
    saveSales(normalized);
    salesRef.current = normalized;
    setSales(normalized);
  }, []);

  const persistCustomers = useCallback((next: Customer[]) => {
    const normalized = sortCustomersByName(normalizeCustomerList(next));
    saveCustomers(normalized);
    customersRef.current = normalized;
    setCustomers(normalized);
  }, []);

  const refreshSalesFromApi = useCallback(async () => {
    if (!(await shouldUseRemoteDataSource())) {
      return;
    }

    const [remoteSales, remoteCustomers] = await Promise.all([
      fetchSales(),
      fetchCustomers(),
    ]);

    salesRef.current = sortSalesByDate(remoteSales);
    customersRef.current = sortCustomersByName(remoteCustomers);
    setSales(salesRef.current);
    setCustomers(customersRef.current);
  }, []);

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
        await runRemoteOrLocal({
          remote: async () => {
            await createCustomerApi(input);
            await refreshSalesFromApi();
          },
          local: () => {
            const now = new Date().toISOString();
            const customer: Customer = {
              id: crypto.randomUUID(),
              name: input.name.trim(),
              phone: input.phone?.trim() || undefined,
              email: input.email?.trim() || undefined,
              notes: input.notes?.trim() || undefined,
              createdAt: now,
              updatedAt: now,
            };

            persistCustomers([...customersRef.current, customer]);
            recordStaffAction({
              action: AUDIT_ACTIONS.CREATE,
              module: "sales",
              recordId: customer.id,
              newValues: pickAuditFields(customer, ["id", "name", "phone", "email"]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [persistCustomers, refreshSalesFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await updateCustomerApi(id, input);
            await refreshSalesFromApi();
          },
          local: () => {
            const now = new Date().toISOString();
            const nextCustomers = customersRef.current.map((customer) =>
              customer.id === id
                ? {
                    ...customer,
                    name: input.name.trim(),
                    phone: input.phone?.trim() || undefined,
                    email: input.email?.trim() || undefined,
                    notes: input.notes?.trim() || undefined,
                    updatedAt: now,
                  }
                : customer
            );

            persistCustomers(nextCustomers);

            const renamed = existing.name !== input.name.trim();
            if (renamed) {
              const nextSales = salesRef.current.map((sale) =>
                sale.customerId === id
                  ? { ...sale, customerName: input.name.trim() }
                  : sale
              );
              persistSales(nextSales);
            }

            recordStaffAction({
              action: AUDIT_ACTIONS.EDIT,
              module: "sales",
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
    [persistCustomers, persistSales, refreshSalesFromApi]
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
        await runRemoteOrLocal({
          remote: async () => {
            await deleteCustomerApi(id);
            await refreshSalesFromApi();
          },
          local: () => {
            const existing = customersRef.current.find(
              (customer) => customer.id === id
            );
            if (existing) {
              recordStaffAction({
                action: AUDIT_ACTIONS.DELETE,
                module: "sales",
                recordId: existing.id,
                oldValues: pickAuditFields(existing, ["id", "name"]),
              });
            }

            persistCustomers(
              customersRef.current.filter((customer) => customer.id !== id)
            );
          },
        });
      })();

      return createValidationResult({});
    },
    [persistCustomers, refreshSalesFromApi]
  );

  const completeSale = useCallback(
    (input: SaleInput): SaleValidationResult => {
      const product = getProductById(input.productId);
      if (!product) {
        return createValidationResult({ productId: "Item not found." });
      }

      const errors = validateSaleInput(input, product.currentStock);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const dateISO = getTodayISO();
      if (isBranchDayClosed(input.branch, dateISO)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }

      const discount = input.discount ?? 0;
      const preview = computeSalePreview(
        input.quantity,
        input.unitPrice,
        product.buyingPrice,
        discount
      );

      const now = new Date();
      const invoiceNumber = generateInvoiceNumber(salesRef.current, dateISO);
      const customer = input.customerId
        ? getCustomerById(input.customerId)
        : undefined;
      const actor = resolveCurrentStaffAction(input.branch);
      const legacy = legacyStaffFields(actor);

      const lineItem = {
        productId: product.id,
        productName: product.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        buyingPrice: product.buyingPrice,
        lineTotal: preview.subtotal,
      };

      const sale: Sale = {
        id: crypto.randomUUID(),
        invoiceNumber,
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

      const movementInput: StockMovementInput = {
        productId: product.id,
        movement: "out",
        quantity: input.quantity,
        reason: "Sale",
        notes: `Sale ${invoiceNumber}`,
        branch: input.branch,
      };

      void (async () => {
        await runRemoteOrLocal({
          remote: async () => {
            await createSaleApi(sale);
            await refreshSalesFromApi();
            await refreshStockFromApi();
          },
          local: () => {
            const movementResult = recordMovement(movementInput);
            if (!movementResult.success) {
              return;
            }

            persistSales([sale, ...salesRef.current]);
            recordStaffAction({
              staffId: actor?.staffId,
              staffName: actor?.staffName,
              role: actor?.role,
              branch: input.branch,
              action: AUDIT_ACTIONS.COMPLETE_SALE,
              module: "sales",
              recordId: sale.id,
              newValues: pickAuditFields(sale, [
                "id",
                "invoiceNumber",
                "total",
                "profit",
                "branch",
                "paymentMethod",
              ]),
            });
          },
        });
      })();

      return createValidationResult({});
    },
    [
      getProductById,
      getCustomerById,
      recordMovement,
      persistSales,
      refreshSalesFromApi,
      refreshStockFromApi,
    ]
  );

  const value = useMemo(
    () => ({
      sales,
      customers,
      metrics,
      isLoaded,
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
