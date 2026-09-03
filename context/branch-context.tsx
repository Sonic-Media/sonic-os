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
  createBranchApi,
  fetchBranches,
  setBranchActiveApi,
  updateBranchApi,
} from "@/lib/api/branches";
import { setActiveBranchApi } from "@/lib/api/auth";
import { registerActiveBranchGetter } from "@/lib/api/branch-request";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import {
  hasValidationErrors,
  validateBranchInput,
} from "@/lib/branch/validation";
import { sortBranchesByName } from "@/lib/branch-storage";
import { resolveBranchDisplayName } from "@/lib/branch/display-name";
import { canSwitchActiveBranch } from "@/lib/branch/access";
import { resolveInventoryBranchCode } from "@/lib/branch/codes";
import { filterByBranchField } from "@/lib/active-branch/filters";
import {
  ACTIVE_BRANCH_STORAGE_KEY,
  DEFAULT_BRANCH_CODE,
  STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY,
} from "@/lib/constants";
import {
  readLocalStorageItem,
  writeLocalStorageItem,
} from "@/lib/safe-storage";
import { useAuth } from "@/context/auth-context";
import type {
  BranchEntity,
  BranchInput,
  BranchUpdateInput,
  BranchValidationResult,
} from "@/types/branch";
import type { Branch } from "@/types";
import type { BranchScope } from "@/lib/api/branch-request";

export type { BranchScope };

interface BranchContextValue {
  // Catalog
  branches: BranchEntity[];
  activeBranches: BranchEntity[];
  isLoaded: boolean;
  loading: boolean;
  loadError: string | null;
  getBranchByCode: (code: Branch) => BranchEntity | undefined;
  getBranchName: (code: Branch) => string;
  addBranch: (input: BranchInput) => BranchValidationResult;
  updateBranch: (id: string, input: BranchUpdateInput) => BranchValidationResult;
  deactivateBranch: (id: string) => void;
  reactivateBranch: (id: string) => void;

  // Global operating context
  activeBranch: Branch;
  branchScope: BranchScope;
  setActiveBranch: (branch: Branch) => Promise<void>;
  canSwitchBranch: boolean;

  // Stock movement UX (defaults to active branch)
  stockMovementBranch: Branch;
  setStockMovementBranch: (branch: Branch) => void;

  // Scoping helpers
  filterByActiveBranch: <T extends { branch: Branch }>(records: T[]) => T[];
}

const BranchContext = createContext<BranchContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>
): BranchValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
  };
}

function readStoredActiveBranch(fallback: Branch): Branch {
  const stored = readLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY)?.trim();
  return stored ? (stored as Branch) : fallback;
}

function readStoredMovementBranch(fallback: Branch): Branch {
  const stored = readLocalStorageItem(
    STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY
  )?.trim();
  return stored ? (stored as Branch) : fallback;
}

function isKnownBranch(
  code: Branch,
  activeBranches: { code: Branch }[]
): boolean {
  return activeBranches.some((branch) => branch.code === code);
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoaded: authLoaded, isAuthenticated } = useAuth();

  const [branches, setBranches] = useState<BranchEntity[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedBranches = useRef(false);
  const branchesRef = useRef(branches);

  const [activeBranch, setActiveBranchState] = useState<Branch>(
    DEFAULT_BRANCH_CODE
  );
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const hasInitializedSelection = useRef(false);

  const [stockMovementBranch, setStockMovementBranchState] = useState<Branch>(
    DEFAULT_BRANCH_CODE
  );

  useEffect(() => {
    branchesRef.current = branches;
  }, [branches]);

  const canSwitchBranch = session ? canSwitchActiveBranch(session.role) : false;

  const refreshBranchesFromApi = useCallback(async () => {
    const remoteBranches = await fetchBranches();
    const normalized = sortBranchesByName(remoteBranches);
    branchesRef.current = normalized;
    setBranches(normalized);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (hasLoadedBranches.current && !isAuthenticated) {
      branchesRef.current = [];
      setBranches([]);
      setLoadError(null);
      setBranchesLoaded(true);
      return;
    }

    if (!isAuthenticated) {
      branchesRef.current = [];
      setBranches([]);
      setLoadError(null);
      setBranchesLoaded(true);
      return;
    }

    if (hasLoadedBranches.current) return;
    hasLoadedBranches.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshBranchesFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setBranchesLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, refreshBranchesFromApi]);

  const lookup = useMemo(
    () => new Map(branches.map((branch) => [branch.code, branch])),
    [branches]
  );

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.active),
    [branches]
  );

  const getBranchByCode = useCallback(
    (code: Branch) => lookup.get(code),
    [lookup]
  );

  const getBranchName = useCallback(
    (code: Branch) => resolveBranchDisplayName(code, lookup.get(code)?.name),
    [lookup]
  );

  useEffect(() => {
    if (!authLoaded || !branchesLoaded) return;

    if (!isAuthenticated || !session) {
      hasInitializedSelection.current = false;
      setActiveBranchState(DEFAULT_BRANCH_CODE);
      setStockMovementBranchState(DEFAULT_BRANCH_CODE);
      setSelectionLoaded(true);
      return;
    }

    if (hasInitializedSelection.current) return;
    hasInitializedSelection.current = true;

    void (async () => {
      const assignedBranch = resolveInventoryBranchCode(session.branch);
      let nextBranch = readStoredActiveBranch(assignedBranch);

      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "include",
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            data?: {
              activeBranchCode?: string | null;
              session?: { branch?: Branch } | null;
            };
          };

          const serverBranch =
            payload.data?.activeBranchCode ??
            payload.data?.session?.branch ??
            assignedBranch;

          if (canSwitchBranch) {
            nextBranch = readStoredActiveBranch(serverBranch as Branch);
          } else {
            nextBranch = assignedBranch;
          }
        }
      } catch {
        nextBranch = canSwitchBranch
          ? readStoredActiveBranch(assignedBranch)
          : assignedBranch;
      }

      if (!isKnownBranch(nextBranch, activeBranches) && activeBranches[0]) {
        nextBranch = activeBranches[0].code;
      }

      if (!canSwitchBranch) {
        nextBranch = assignedBranch;
      }

      setActiveBranchState(nextBranch);
      setStockMovementBranchState(readStoredMovementBranch(nextBranch));
      writeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY, nextBranch);
      setSelectionLoaded(true);
    })();
  }, [
    activeBranches,
    authLoaded,
    branchesLoaded,
    canSwitchBranch,
    isAuthenticated,
    session,
  ]);

  useEffect(() => {
    registerActiveBranchGetter(() => activeBranch);
    return () => registerActiveBranchGetter(() => null);
  }, [activeBranch]);

  useEffect(() => {
    if (!selectionLoaded) return;
    setStockMovementBranchState((current) =>
      readStoredMovementBranch(current === DEFAULT_BRANCH_CODE ? activeBranch : current)
    );
  }, [activeBranch, selectionLoaded]);

  const setActiveBranch = useCallback(
    async (branch: Branch) => {
      if (session && !canSwitchBranch) {
        const locked = resolveInventoryBranchCode(session.branch);
        setActiveBranchState(locked);
        writeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY, locked);
        return;
      }

      const normalized = branch.trim().toLowerCase() as Branch;

      if (session) {
        try {
          await setActiveBranchApi(normalized);
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
          return;
        }
      }

      setActiveBranchState(normalized);
      writeLocalStorageItem(ACTIVE_BRANCH_STORAGE_KEY, normalized);
      setStockMovementBranchState(normalized);
      writeLocalStorageItem(
        STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY,
        normalized
      );
    },
    [canSwitchBranch, session]
  );

  const setStockMovementBranch = useCallback((branch: Branch) => {
    setStockMovementBranchState(branch);
    writeLocalStorageItem(STOCK_LAST_MOVEMENT_BRANCH_STORAGE_KEY, branch);
  }, []);

  const filterByActiveBranch = useCallback(
    <T extends { branch: Branch }>(records: T[]) =>
      filterByBranchField(records, activeBranch),
    [activeBranch]
  );

  const addBranch = useCallback(
    (input: BranchInput): BranchValidationResult => {
      const errors = validateBranchInput(input, branchesRef.current);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await createBranchApi(input);
            await refreshBranchesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshBranchesFromApi]
  );

  const updateBranch = useCallback(
    (id: string, input: BranchUpdateInput): BranchValidationResult => {
      const existing = branchesRef.current.find((branch) => branch.id === id);
      if (!existing) {
        return createValidationResult({ form: "Branch not found." });
      }

      const errors = validateBranchInput(input, branchesRef.current, id);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        try {
          await runOnApi(async () => {
            await updateBranchApi(id, input);
            await refreshBranchesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return createValidationResult({});
    },
    [refreshBranchesFromApi]
  );

  const deactivateBranch = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await runOnApi(async () => {
            await setBranchActiveApi(id, false);
            await refreshBranchesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshBranchesFromApi]
  );

  const reactivateBranch = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await runOnApi(async () => {
            await setBranchActiveApi(id, true);
            await refreshBranchesFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshBranchesFromApi]
  );

  const isLoaded = branchesLoaded && selectionLoaded;
  const loading = !isLoaded;

  const value = useMemo(
    () => ({
      branches,
      activeBranches,
      isLoaded,
      loading,
      loadError,
      getBranchByCode,
      getBranchName,
      addBranch,
      updateBranch,
      deactivateBranch,
      reactivateBranch,
      activeBranch,
      branchScope: activeBranch as BranchScope,
      setActiveBranch,
      canSwitchBranch,
      stockMovementBranch,
      setStockMovementBranch,
      filterByActiveBranch,
    }),
    [
      branches,
      activeBranches,
      isLoaded,
      loading,
      loadError,
      getBranchByCode,
      getBranchName,
      addBranch,
      updateBranch,
      deactivateBranch,
      reactivateBranch,
      activeBranch,
      setActiveBranch,
      canSwitchBranch,
      stockMovementBranch,
      setStockMovementBranch,
      filterByActiveBranch,
    ]
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}

/** @deprecated Prefer `useBranch()` — kept for backward compatibility. */
export function useActiveBranch() {
  const {
    activeBranch,
    isLoaded,
    loading,
    setActiveBranch,
  } = useBranch();
  return { activeBranch, isLoaded, loading, setActiveBranch };
}

/** @deprecated Prefer `useBranch()` — kept for backward compatibility. */
export function useBranches() {
  const {
    branches,
    activeBranches,
    isLoaded,
    loading,
    loadError,
    getBranchByCode,
    getBranchName,
    addBranch,
    updateBranch,
    deactivateBranch,
    reactivateBranch,
  } = useBranch();
  return {
    branches,
    activeBranches,
    isLoaded,
    loadError,
    getBranchByCode,
    getBranchName,
    addBranch,
    updateBranch,
    deactivateBranch,
    reactivateBranch,
  };
}
