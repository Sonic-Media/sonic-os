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
import { setActiveBranchApi } from "@/lib/api/auth";
import { isApiAvailable } from "@/lib/data-source";
import { shouldUseApiDataSource } from "@/lib/env";
import {
  ACTIVE_BRANCH_STORAGE_KEY,
  DEFAULT_BRANCH_CODE,
} from "@/lib/constants";
import { useAuth } from "@/context/auth-context";
import { useBranches } from "@/context/branches-context";
import type { Branch } from "@/types";

interface ActiveBranchContextValue {
  activeBranch: Branch;
  isLoaded: boolean;
  setActiveBranch: (branch: Branch) => Promise<void>;
}

const ActiveBranchContext = createContext<ActiveBranchContextValue | null>(
  null
);

function readStoredBranch(): Branch {
  if (typeof window === "undefined") return DEFAULT_BRANCH_CODE;
  return localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY)?.trim() || DEFAULT_BRANCH_CODE;
}

function writeStoredBranch(branch: Branch) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branch);
}

export function ActiveBranchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isLoaded: authLoaded } = useAuth();
  const { activeBranches, getBranchByCode, isLoaded: branchesLoaded } =
    useBranches();
  const [activeBranch, setActiveBranchState] = useState<Branch>(
    DEFAULT_BRANCH_CODE
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!authLoaded || !branchesLoaded || hasInitialized.current) return;
    hasInitialized.current = true;

    async function initialize() {
      let nextBranch = readStoredBranch();

      if (session?.branch) {
        nextBranch = session.branch;
      }

      if (shouldUseApiDataSource() && (await isApiAvailable()) && session) {
        try {
          const response = await fetch("/api/auth/session", {
            cache: "no-store",
            credentials: "include",
          });
          if (response.ok) {
            const payload = (await response.json()) as {
              data?: { activeBranchCode?: string | null; session?: { branch?: Branch } | null };
            };
            nextBranch =
              payload.data?.activeBranchCode ??
              payload.data?.session?.branch ??
              nextBranch;
          }
        } catch {
          // Keep stored branch when preference API is unavailable.
        }
      }

      if (!getBranchByCode(nextBranch) && activeBranches[0]) {
        nextBranch = activeBranches[0].code;
      }

      writeStoredBranch(nextBranch);
      setActiveBranchState(nextBranch);
      setIsLoaded(true);
    }

    void initialize();
  }, [
    activeBranches,
    authLoaded,
    branchesLoaded,
    getBranchByCode,
    session,
  ]);

  const setActiveBranch = useCallback(
    async (branch: Branch) => {
      const normalized = branch.trim().toLowerCase();
      writeStoredBranch(normalized);
      setActiveBranchState(normalized);

      if (shouldUseApiDataSource() && (await isApiAvailable()) && session) {
        try {
          await setActiveBranchApi(normalized);
        } catch {
          // Local preference still applies when API write fails.
        }
      }
    },
    [session]
  );

  const value = useMemo(
    () => ({
      activeBranch,
      isLoaded,
      setActiveBranch,
    }),
    [activeBranch, isLoaded, setActiveBranch]
  );

  return (
    <ActiveBranchContext.Provider value={value}>
      {children}
    </ActiveBranchContext.Provider>
  );
}

export function useActiveBranch() {
  const context = useContext(ActiveBranchContext);
  if (!context) {
    throw new Error("useActiveBranch must be used within an ActiveBranchProvider");
  }
  return context;
}
