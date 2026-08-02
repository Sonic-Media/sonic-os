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
import { getTodayISO } from "@/lib/dates";
import {
  getStockMovements,
  getStockPriceChanges,
  getStockProducts,
  normalizeStockMovementList,
  normalizeStockPriceChangeList,
  normalizeStockProductList,
  saveStockMovements,
  saveStockPriceChanges,
  saveStockProducts,
  sortMovementsByDate,
  sortPriceChangesByDate,
  sortProductsByName,
} from "@/lib/stock-storage";
import { computeDashboardMetrics } from "@/lib/stock/calculations";
import {
  hasValidationErrors,
  validateStockMovementInput,
  validateStockProductInput,
  validateStockProductUpdateInput,
} from "@/lib/stock/validation";
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
  getProductById: (id: string) => StockProduct | undefined;
  addProduct: (input: StockProductInput) => StockValidationResult;
  updateProduct: (
    id: string,
    input: StockProductUpdateInput
  ) => StockValidationResult;
  deleteProduct: (id: string) => void;
  recordMovement: (input: StockMovementInput) => StockValidationResult;
  getStockSnapshot: () => {
    products: StockProduct[];
    movements: StockMovement[];
  };
  restoreStockSnapshot: (snapshot: {
    products: StockProduct[];
    movements: StockMovement[];
  }) => void;
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
  const [products, setProducts] = useState<StockProduct[]>(() =>
    getStockProducts()
  );
  const [movements, setMovements] = useState<StockMovement[]>(() =>
    getStockMovements()
  );
  const [priceChanges, setPriceChanges] = useState<StockPriceChange[]>(() =>
    getStockPriceChanges()
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
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

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      setProducts(getStockProducts());
      setMovements(getStockMovements());
      setPriceChanges(getStockPriceChanges());
      setIsLoaded(true);
    });
  }, []);

  const persistProducts = useCallback((next: StockProduct[]) => {
    const normalized = sortProductsByName(normalizeStockProductList(next));
    saveStockProducts(normalized);
    productsRef.current = normalized;
    setProducts(normalized);
  }, []);

  const persistMovements = useCallback((next: StockMovement[]) => {
    const normalized = sortMovementsByDate(normalizeStockMovementList(next));
    saveStockMovements(normalized);
    movementsRef.current = normalized;
    setMovements(normalized);
  }, []);

  const persistPriceChanges = useCallback((next: StockPriceChange[]) => {
    const normalized = sortPriceChangesByDate(
      normalizeStockPriceChangeList(next)
    );
    saveStockPriceChanges(normalized);
    priceChangesRef.current = normalized;
    setPriceChanges(normalized);
  }, []);

  const lookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const getProductById = useCallback(
    (id: string) => lookup.get(id),
    [lookup]
  );

  const metrics = useMemo(
    () => computeDashboardMetrics(products, movements, getTodayISO()),
    [products, movements]
  );

  const addProduct = useCallback(
    (input: StockProductInput): StockValidationResult => {
      const errors = validateStockProductInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const now = new Date().toISOString();
      const product: StockProduct = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        category: input.category,
        sku: input.sku?.trim() || undefined,
        buyingPrice: input.buyingPrice,
        sellingPrice: input.sellingPrice,
        currentStock: 0,
        minimumStockLevel: input.minimumStockLevel,
        notes: input.notes?.trim() || undefined,
        status: "out-of-stock",
        createdAt: now,
        updatedAt: now,
      };

      const nextProducts = sortProductsByName([
        ...productsRef.current,
        product,
      ]);
      persistProducts(nextProducts);

      return createValidationResult({}, product);
    },
    [persistProducts, persistMovements]
  );

  const updateProduct = useCallback(
    (id: string, input: StockProductUpdateInput): StockValidationResult => {
      const existing = productsRef.current.find((product) => product.id === id);
      if (!existing) {
        return createValidationResult({ form: "Item not found." });
      }

      const errors = validateStockProductUpdateInput(input);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const now = new Date().toISOString();
      const nextProducts = productsRef.current.map((product) =>
        product.id === id
          ? {
              ...product,
              name: input.name.trim(),
              category: input.category,
              sku: input.sku?.trim() || undefined,
              buyingPrice: input.buyingPrice,
              sellingPrice: input.sellingPrice,
              minimumStockLevel: input.minimumStockLevel,
              notes: input.notes?.trim() || undefined,
              updatedAt: now,
            }
          : product
      );

      persistProducts(nextProducts);

      const buyingPriceChanged = existing.buyingPrice !== input.buyingPrice;
      const sellingPriceChanged = existing.sellingPrice !== input.sellingPrice;

      if (buyingPriceChanged || sellingPriceChanged) {
        const priceChange: StockPriceChange = {
          id: crypto.randomUUID(),
          productId: id,
          previousBuyingPrice: existing.buyingPrice,
          previousSellingPrice: existing.sellingPrice,
          newBuyingPrice: input.buyingPrice,
          newSellingPrice: input.sellingPrice,
          createdAt: now,
        };
        persistPriceChanges([priceChange, ...priceChangesRef.current]);
      }

      const renamed = existing.name !== input.name.trim();
      if (renamed) {
        const nextMovements = movementsRef.current.map((movement) =>
          movement.productId === id
            ? { ...movement, productName: input.name.trim() }
            : movement
        );
        persistMovements(nextMovements);
      }

      return createValidationResult({});
    },
    [persistProducts, persistMovements, persistPriceChanges]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      persistProducts(
        productsRef.current.filter((product) => product.id !== id)
      );
      persistMovements(
        movementsRef.current.filter((movement) => movement.productId !== id)
      );
      persistPriceChanges(
        priceChangesRef.current.filter((change) => change.productId !== id)
      );
    },
    [persistProducts, persistMovements, persistPriceChanges]
  );

  const recordMovement = useCallback(
    (input: StockMovementInput): StockValidationResult => {
      const product = productsRef.current.find(
        (item) => item.id === input.productId
      );

      if (!product) {
        return createValidationResult({ productId: "Item not found." });
      }

      const errors = validateStockMovementInput(input, product.currentStock);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      const now = new Date().toISOString();
      const nextStock =
        input.movement === "in"
          ? product.currentStock + input.quantity
          : product.currentStock - input.quantity;

      if (nextStock < 0) {
        return createValidationResult({
          quantity: "Stock cannot go below zero.",
        });
      }

      const movement: StockMovement = {
        id: crypto.randomUUID(),
        date: input.date ?? getTodayISO(),
        productId: product.id,
        productName: product.name,
        movement: input.movement,
        quantity: input.quantity,
        reason: input.reason.trim(),
        branch: input.branch,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
      };

      const nextProducts = productsRef.current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              currentStock: nextStock,
              updatedAt: now,
            }
          : item
      );

      persistProducts(nextProducts);
      persistMovements([movement, ...movementsRef.current]);

      return createValidationResult({});
    },
    [persistProducts, persistMovements]
  );

  const getStockSnapshot = useCallback(
    () => ({
      products: productsRef.current.map((product) => ({ ...product })),
      movements: [...movementsRef.current],
    }),
    []
  );

  const restoreStockSnapshot = useCallback(
    (snapshot: { products: StockProduct[]; movements: StockMovement[] }) => {
      persistProducts(snapshot.products);
      persistMovements(snapshot.movements);
    },
    [persistProducts, persistMovements]
  );

  const value = useMemo(
    () => ({
      products,
      movements,
      priceChanges,
      metrics,
      isLoaded,
      getProductById,
      addProduct,
      updateProduct,
      deleteProduct,
      recordMovement,
      getStockSnapshot,
      restoreStockSnapshot,
    }),
    [
      products,
      movements,
      priceChanges,
      metrics,
      isLoaded,
      getProductById,
      addProduct,
      updateProduct,
      deleteProduct,
      recordMovement,
      getStockSnapshot,
      restoreStockSnapshot,
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
