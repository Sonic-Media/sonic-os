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
import { useAuth } from "@/context/auth-context";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction } from "@/lib/staff/audit";
import type {
  BranchEntity,
  BranchInput,
  BranchUpdateInput,
  BranchValidationResult,
} from "@/types/branch";
import type { Branch } from "@/types";

interface BranchesContextValue {
  branches: BranchEntity[];
  activeBranches: BranchEntity[];
  isLoaded: boolean;
  loadError: string | null;
  getBranchByCode: (code: Branch) => BranchEntity | undefined;
  getBranchName: (code: Branch) => string;
  addBranch: (input: BranchInput) => BranchValidationResult;
  updateBranch: (id: string, input: BranchUpdateInput) => BranchValidationResult;
  deactivateBranch: (id: string) => void;
  reactivateBranch: (id: string) => void;
}

const BranchesContext = createContext<BranchesContextValue | null>(null);

function createValidationResult(
  errors: Record<string, string | undefined>
): BranchValidationResult {
  return {
    success: !hasValidationErrors(errors),
    errors,
  };
}

export function BranchesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const [branches, setBranches] = useState<BranchEntity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const branchesRef = useRef(branches);

  useEffect(() => {
    branchesRef.current = branches;
  }, [branches]);

  const refreshBranchesFromApi = useCallback(async () => {
    const remoteBranches = await fetchBranches();
    const normalized = sortBranchesByName(remoteBranches);
    branchesRef.current = normalized;
    setBranches(normalized);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (hasLoaded.current && !isAuthenticated) {
      branchesRef.current = [];
      setBranches([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (!isAuthenticated) {
      branchesRef.current = [];
      setBranches([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshBranchesFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
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

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <BranchesContext.Provider value={value}>{children}</BranchesContext.Provider>
  );
}

export function useBranches() {
  const context = useContext(BranchesContext);
  if (!context) {
    throw new Error("useBranches must be used within a BranchesProvider");
  }
  return context;
}
