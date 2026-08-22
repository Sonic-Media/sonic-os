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
import {
  createStockMovementApi,
  createStockProductApi,
  deleteStockProductApi,
  fetchStockMovements,
  fetchStockPriceChanges,
  fetchStockProducts,
  updateStockProductApi,
} from "@/lib/api/stock";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import { getTodayISO } from "@/lib/dates";
import {
  normalizeStockMovementList,
  normalizeStockPriceChangeList,
  normalizeStockProductList,
  sortMovementsByDate,
  sortPriceChangesByDate,
  sortProductsByName,
} from "@/lib/stock-storage";
import { computeDashboardMetrics } from "@/lib/stock/calculations";
import {
  getBranchProductStock,
  getBranchProductsForSale,
  type BranchSaleProduct,
} from "@/lib/stock/branch-inventory";
import {
  hasValidationErrors,
  validateStockMovementInput,
  validateStockProductInput,
  validateStockProductUpdateInput,
} from "@/lib/stock/validation";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction } from "@/lib/staff/audit";
import { resolveCurrentStaffAction } from "@/lib/staff/session";
import { roleHasModuleAccess } from "@/lib/staff/permissions";
import { useAuth } from "@/context/auth-context";
import type { Branch } from "@/types";
import {
  DAY_CLOSED_EDIT_MESSAGE,
  isBranchDayClosed,
  isBranchDayOpened,
  SHOP_NOT_OPENED_MESSAGE,
} from "@/lib/day-closing/storage";
import type {
  StockDashboardMetrics,
  StockMovement,
  StockMovementInput,
  StockPriceChange,
  StockProduct,
  StockProductInput,
  StockProductUpdateInput,
  StockValidationResult,
} from "@/types/stock";

interface StockContextValue {
  products: StockProduct[];
  movements: StockMovement[];
  priceChanges: StockPriceChange[];
  metrics: StockDashboardMetrics;
  isLoaded: boolean;
  loadError: string | null;
  getProductById: (id: string) => StockProduct | undefined;
  getBranchProductStock: (productId: string, branchCode: Branch) => number;
  getProductsAvailableForSale: (branchCode: Branch) => BranchSaleProduct[];
  addProduct: (input: StockProductInput) => Promise<StockValidationResult>;
  updateProduct: (
    id: string,
    input: StockProductUpdateInput
  ) => Promise<StockValidationResult>;
  deleteProduct: (id: string) => Promise<StockValidationResult>;
  recordMovement: (input: StockMovementInput) => Promise<StockValidationResult>;
  refreshStockFromApi: () => Promise<void>;
}

const StockContext = createContext<StockContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>,
  product?: StockProduct
): StockValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
    product,
  };
}

export function StockProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded, session } = useAuth();
  const canAccessStockModule =
    session !== null && roleHasModuleAccess(session.role, "stock");
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [priceChanges, setPriceChanges] = useState<StockPriceChange[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const lastStockAccess = useRef<boolean | null>(null);
  const productsRef = useRef(products);
  const movementsRef = useRef(movements);
  const priceChangesRef = useRef(priceChanges);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    movementsRef.current = movements;
  }, [movements]);

  useEffect(() => {
    priceChangesRef.current = priceChanges;
  }, [priceChanges]);

  const refreshStockFromApi = useCallback(async () => {
    const remoteProducts = await fetchStockProducts();

    productsRef.current = normalizeStockProductList(remoteProducts);
    setProducts(productsRef.current);

    if (!canAccessStockModule) {
      movementsRef.current = [];
      priceChangesRef.current = [];
      setMovements([]);
      setPriceChanges([]);
      return;
    }

    const [remoteMovements, remotePriceChanges] = await Promise.all([
      fetchStockMovements(),
      fetchStockPriceChanges(),
    ]);

    movementsRef.current = normalizeStockMovementList(remoteMovements);
    priceChangesRef.current = normalizeStockPriceChangeList(remotePriceChanges);
    setMovements(movementsRef.current);
    setPriceChanges(priceChangesRef.current);
  }, [canAccessStockModule]);

  useEffect(() => {
    if (!authLoaded) return;

    if (!isAuthenticated) {
      productsRef.current = [];
      movementsRef.current = [];
      priceChangesRef.current = [];
      setProducts([]);
      setMovements([]);
      setPriceChanges([]);
      setLoadError(null);
      hasLoaded.current = false;
      lastStockAccess.current = null;
      setIsLoaded(true);
      return;
    }

    if (
      hasLoaded.current &&
      lastStockAccess.current === canAccessStockModule
    ) {
      return;
    }

    hasLoaded.current = true;
    lastStockAccess.current = canAccessStockModule;

    queueMicrotask(() => {
      void (async () => {
        try {
          const loaded = await loadFromApi(async () => {
            const remoteProducts = await fetchStockProducts();

            if (!canAccessStockModule) {
              return {
                products: sortProductsByName(remoteProducts),
                movements: [] as StockMovement[],
                priceChanges: [] as StockPriceChange[],
              };
            }

            const [remoteMovements, remotePriceChanges] = await Promise.all([
              fetchStockMovements(),
              fetchStockPriceChanges(),
            ]);

            return {
              products: sortProductsByName(remoteProducts),
              movements: sortMovementsByDate(remoteMovements),
              priceChanges: sortPriceChangesByDate(remotePriceChanges),
            };
          });

          productsRef.current = normalizeStockProductList(loaded.products);
          movementsRef.current = normalizeStockMovementList(loaded.movements);
          priceChangesRef.current = normalizeStockPriceChangeList(
            loaded.priceChanges
          );
          setProducts(productsRef.current);
          setMovements(movementsRef.current);
          setPriceChanges(priceChangesRef.current);
          setLoadError(null);
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, canAccessStockModule]);

  const lookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const getProductById = useCallback(
    (id: string) => lookup.get(id),
    [lookup]
  );

  const getBranchProductStockForBranch = useCallback(
    (productId: string, branchCode: Branch) =>
      getBranchProductStock(
        productId,
        branchCode,
        movementsRef.current
      ),
    []
  );

  const getProductsAvailableForSale = useCallback(
    (branchCode: Branch) =>
      getBranchProductsForSale(
        productsRef.current,
        movementsRef.current,
        branchCode
      ),
    []
  );

  const metrics = useMemo(
    () => computeDashboardMetrics(products, movements, getTodayISO()),
    [products, movements]
  );

  const addProduct = useCallback(
    async (input: StockProductInput): Promise<StockValidationResult> => {
      if (!isAuthenticated) {
        return createValidationResult({
          form: "Authentication required.",
        });
      }

      const errors = validateStockProductInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      try {
        const product = await runOnApi(async () => {
          const created = await createStockProductApi(input);
          await refreshStockFromApi();
          return created;
        });

        return createValidationResult({}, product);
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [isAuthenticated, refreshStockFromApi]
  );

  const updateProduct = useCallback(
    async (
      id: string,
      input: StockProductUpdateInput
    ): Promise<StockValidationResult> => {
      const existing = productsRef.current.find((product) => product.id === id);
      if (!existing) {
        return createValidationResult({ form: "Item not found." });
      }

      const errors = validateStockProductUpdateInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      try {
        const product = await runOnApi(async () => {
          const updated = await updateStockProductApi(id, input);
          await refreshStockFromApi();
          return updated;
        });

        return createValidationResult({}, product);
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [refreshStockFromApi]
  );

  const deleteProduct = useCallback(
    async (id: string): Promise<StockValidationResult> => {
      const existing = productsRef.current.find((product) => product.id === id);
      if (!existing) {
        return createValidationResult({ form: "Item not found." });
      }

      try {
        await runOnApi(async () => {
          await deleteStockProductApi(id);
          await refreshStockFromApi();
        });

        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [refreshStockFromApi]
  );

  const recordMovement = useCallback(
    async (input: StockMovementInput): Promise<StockValidationResult> => {
      const product = productsRef.current.find(
        (item) => item.id === input.productId
      );

      if (!product) {
        return createValidationResult({ productId: "Item not found." });
      }

      const branchStock = getBranchProductStock(
        product.id,
        input.branch,
        movementsRef.current
      );
      const errors = validateStockMovementInput(input, branchStock);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const movementDate = input.date ?? getTodayISO();
      if (isBranchDayClosed(input.branch, movementDate)) {
        return createValidationResult({ form: DAY_CLOSED_EDIT_MESSAGE });
      }
      if (!isBranchDayOpened(input.branch, movementDate)) {
        return createValidationResult({ form: SHOP_NOT_OPENED_MESSAGE });
      }

      try {
        await runOnApi(async () => {
          const actor = resolveCurrentStaffAction(input.branch);
          await createStockMovementApi({
            ...input,
            createdBy: actor,
          } as StockMovementInput);
          await refreshStockFromApi();
        });

        return createValidationResult({});
      } catch (error) {
        return createValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [refreshStockFromApi]
  );

  const value = useMemo(
    () => ({
      products,
      movements,
      priceChanges,
      metrics,
      isLoaded,
      loadError,
      getProductById,
      getBranchProductStock: getBranchProductStockForBranch,
      getProductsAvailableForSale,
      addProduct,
      updateProduct,
      deleteProduct,
      recordMovement,
      refreshStockFromApi,
    }),
    [
      products,
      movements,
      priceChanges,
      metrics,
      isLoaded,
      loadError,
      getProductById,
      getBranchProductStockForBranch,
      getProductsAvailableForSale,
      addProduct,
      updateProduct,
      deleteProduct,
      recordMovement,
      refreshStockFromApi,
    ]
  );

  return (
    <StockContext.Provider value={value}>{children}</StockContext.Provider>
  );
}

export function useStock() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error("useStock must be used within a StockProvider");
  }
  return context;
}
