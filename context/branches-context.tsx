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
  buildBranchLookup,
  getBranches,
  normalizeBranchList,
  saveBranches,
  sortBranchesByName,
} from "@/lib/branch-storage";
import {
  createBranchApi,
  fetchBranches,
  setBranchActiveApi,
  updateBranchApi,
} from "@/lib/api/branches";
import { isApiAvailable } from "@/lib/data-source";
import { shouldUseApiDataSource } from "@/lib/env";
import {
  hasValidationErrors,
  validateBranchInput,
} from "@/lib/branch/validation";
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
  const [branches, setBranches] = useState<BranchEntity[]>(() => getBranches());
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const branchesRef = useRef(branches);

  useEffect(() => {
    branchesRef.current = branches;
  }, [branches]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        if (shouldUseApiDataSource() && (await isApiAvailable())) {
          try {
            const remoteBranches = await fetchBranches();
            branchesRef.current = sortBranchesByName(remoteBranches);
            setBranches(branchesRef.current);
            setIsLoaded(true);
            return;
          } catch {
            // Fall back to local storage when API is unavailable.
          }
        }

        setBranches(getBranches());
        setIsLoaded(true);
      })();
    });
  }, []);

  const persistBranches = useCallback((next: BranchEntity[]) => {
    const normalized = sortBranchesByName(normalizeBranchList(next));
    branchesRef.current = normalized;
    setBranches(normalized);
    saveBranches(normalized);
  }, []);

  const refreshBranchesFromApi = useCallback(async () => {
    if (!(shouldUseApiDataSource() && (await isApiAvailable()))) {
      return;
    }

    const remoteBranches = await fetchBranches();
    branchesRef.current = sortBranchesByName(remoteBranches);
    setBranches(branchesRef.current);
  }, []);

  const lookup = useMemo(() => buildBranchLookup(branches), [branches]);

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.active),
    [branches]
  );

  const getBranchByCode = useCallback(
    (code: Branch) => lookup.get(code),
    [lookup]
  );

  const getBranchName = useCallback(
    (code: Branch) => lookup.get(code)?.name ?? code,
    [lookup]
  );

  const addBranch = useCallback(
    (input: BranchInput): BranchValidationResult => {
      const errors = validateBranchInput(input, branchesRef.current);
      if (hasValidationErrors(errors)) {
        return createValidationResult(errors);
      }

      void (async () => {
        if (shouldUseApiDataSource() && (await isApiAvailable())) {
          try {
            await createBranchApi(input);
            await refreshBranchesFromApi();
            return;
          } catch {
            // Fall back to local persistence below.
          }
        }

        const branch: BranchEntity = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          code: input.code.trim().toLowerCase(),
          address: input.address?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          manager: input.manager?.trim() || undefined,
          active: true,
          createdAt: new Date().toISOString(),
        };

        persistBranches([...branchesRef.current, branch]);
      })();

      return createValidationResult({});
    },
    [persistBranches, refreshBranchesFromApi]
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
        if (shouldUseApiDataSource() && (await isApiAvailable())) {
          try {
            await updateBranchApi(id, input);
            await refreshBranchesFromApi();
            return;
          } catch {
            // Fall back to local persistence below.
          }
        }

        const nextBranches = branchesRef.current.map((branch) =>
          branch.id === id
            ? {
                ...branch,
                name: input.name.trim(),
                code: input.code.trim().toLowerCase(),
                address: input.address?.trim() || undefined,
                phone: input.phone?.trim() || undefined,
                manager: input.manager?.trim() || undefined,
              }
            : branch
        );

        persistBranches(nextBranches);
      })();

      return createValidationResult({});
    },
    [persistBranches, refreshBranchesFromApi]
  );

  const deactivateBranch = useCallback(
    (id: string) => {
      void (async () => {
        if (shouldUseApiDataSource() && (await isApiAvailable())) {
          try {
            await setBranchActiveApi(id, false);
            await refreshBranchesFromApi();
            return;
          } catch {
            // Fall back to local persistence below.
          }
        }

        persistBranches(
          branchesRef.current.map((branch) =>
            branch.id === id ? { ...branch, active: false } : branch
          )
        );
      })();
    },
    [persistBranches, refreshBranchesFromApi]
  );

  const reactivateBranch = useCallback(
    (id: string) => {
      void (async () => {
        if (shouldUseApiDataSource() && (await isApiAvailable())) {
          try {
            await setBranchActiveApi(id, true);
            await refreshBranchesFromApi();
            return;
          } catch {
            // Fall back to local persistence below.
          }
        }

        persistBranches(
          branchesRef.current.map((branch) =>
            branch.id === id ? { ...branch, active: true } : branch
          )
        );
      })();
    },
    [persistBranches, refreshBranchesFromApi]
  );

  const value = useMemo(
    () => ({
      branches,
      activeBranches,
      isLoaded,
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
