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
import { getDataSourceErrorMessage } from "@/lib/data-source/context-api";
import { DEFAULT_BRANCH_CODE } from "@/lib/constants";
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

export function ActiveBranchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isLoaded: authLoaded, isAuthenticated } = useAuth();
  const { activeBranches, getBranchByCode, isLoaded: branchesLoaded } =
    useBranches();
  const [activeBranch, setActiveBranchState] = useState<Branch>(
    DEFAULT_BRANCH_CODE
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!authLoaded || !branchesLoaded) return;

    if (!isAuthenticated || !session) {
      setActiveBranchState(DEFAULT_BRANCH_CODE);
      setIsLoaded(true);
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    void (async () => {
      let nextBranch = session.branch;

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

          nextBranch =
            payload.data?.activeBranchCode ??
            payload.data?.session?.branch ??
            session.branch;
        }
      } catch {
        nextBranch = session.branch;
      }

      if (!getBranchByCode(nextBranch) && activeBranches[0]) {
        nextBranch = activeBranches[0].code;
      }

      setActiveBranchState(nextBranch);
      setIsLoaded(true);
    })();
  }, [
    activeBranches,
    authLoaded,
    branchesLoaded,
    getBranchByCode,
    isAuthenticated,
    session,
  ]);

  const setActiveBranch = useCallback(
    async (branch: Branch) => {
      const normalized = branch.trim().toLowerCase();
      setActiveBranchState(normalized);

      if (!session) return;

      try {
        await setActiveBranchApi(normalized);
      } catch (error) {
        console.error(getDataSourceErrorMessage(error));
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
