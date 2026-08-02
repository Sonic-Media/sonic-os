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
  buildStaffLookup,
  getActiveStaffForBranch,
  getStaffList,
  linkStaffToUser,
  normalizeStaffList,
  resolveStaffDisplayName,
  saveStaffList,
  sortStaffByName,
  unlinkStaffUser,
} from "@/lib/staff-storage";
import { isStaffRoleId } from "@/lib/staff/roles";
import { recordActivity } from "@/lib/activity-log";
import { getExpenseRecords } from "@/lib/expenses-module-storage";
import { getPurchases } from "@/lib/purchasing-storage";
import { getSales } from "@/lib/sales-storage";
import { getSettings } from "@/lib/settings-storage";
import { getEntries } from "@/lib/storage";
import type { Branch, Staff } from "@/types";
import type { StaffInput, StaffRoleId, StaffStatus } from "@/types/staff-role";

export interface StaffValidationResult {
  success: boolean;
  errors: Record<string, string | undefined>;
  staff?: Staff;
}

function createStaffValidationResult(
  errors: Record<string, string | undefined>,
  staff?: Staff
): StaffValidationResult {
  return {
    success: !Object.values(errors).some(Boolean),
    errors,
    staff,
  };
}

function isStaffReferenced(id: string): boolean {
  if (getSales().some((sale) => sale.staffId === id)) return true;
  if (getPurchases().some((purchase) => purchase.staffId === id)) return true;
  if (getExpenseRecords().some((expense) => expense.staffId === id)) return true;
  if (getEntries().some((entry) => entry.staffId === id)) return true;
  return false;
}

interface StaffContextValue {
  staff: Staff[];
  activeStaff: Staff[];
  isLoaded: boolean;
  getStaffById: (id: string) => Staff | undefined;
  getActiveStaffForBranch: (branch: Branch) => Staff[];
  getStaffDisplayName: (staffId: string, fallbackName?: string) => string;
  addStaff: (input: StaffInput) => StaffValidationResult;
  updateStaff: (
    id: string,
    patch: Partial<
      Pick<Staff, "name" | "branch" | "role" | "loginEnabled" | "status" | "active">
    >
  ) => void;
  linkStaffAccount: (staffId: string, userId: string) => void;
  unlinkStaffAccount: (staffId: string) => void;
  deactivateStaff: (id: string) => void;
  deleteStaff: (id: string) => StaffValidationResult;
}

const StaffContext = createContext<StaffContextValue | null>(null);

function normalizeStaffPatch(patch: Partial<Pick<Staff, "name" | "branch" | "role" | "loginEnabled" | "status" | "active">>) {
  const next: Partial<Staff> = { ...patch };

  if (typeof patch.name === "string") {
    next.name = patch.name.trim() || undefined;
  }

  if (patch.status) {
    next.active = patch.status === "active";
  } else if (typeof patch.active === "boolean") {
    next.status = patch.active ? "active" : "inactive";
    next.active = patch.active;
  }

  return next;
}

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff[]>(() => getStaffList());
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const staffRef = useRef(staff);

  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      setStaff(getStaffList());
      setIsLoaded(true);
    });
  }, []);

  const persistStaff = useCallback((next: Staff[]) => {
    const normalized = normalizeStaffList(next);
    saveStaffList(normalized);
    staffRef.current = normalized;
    setStaff(normalized);
  }, []);

  const lookup = useMemo(() => buildStaffLookup(staff), [staff]);

  const activeStaff = useMemo(
    () => staff.filter((member) => member.active && member.status === "active"),
    [staff]
  );

  const getStaffById = useCallback(
    (id: string) => lookup.get(id),
    [lookup]
  );

  const getActiveStaffForBranchFn = useCallback(
    (branch: Branch) => getActiveStaffForBranch(staff, branch),
    [staff]
  );

  const getStaffDisplayName = useCallback(
    (staffId: string, fallbackName = "") =>
      resolveStaffDisplayName(staffId, fallbackName, lookup),
    [lookup]
  );

  const addStaff = useCallback(
    (input: StaffInput): StaffValidationResult => {
      const errors: Record<string, string | undefined> = {};
      const name = input.name.trim();

      if (!name) {
        errors.name = "Name is required.";
      }

      if (!input.branch?.trim()) {
        errors.branch = "Branch is required.";
      }

      if (!input.role || !isStaffRoleId(input.role)) {
        errors.role = "Role is required.";
      }

      if (Object.values(errors).some(Boolean)) {
        return createStaffValidationResult(errors);
      }

      const status: StaffStatus = input.status ?? "active";
      const member: Staff = {
        id: crypto.randomUUID(),
        name,
        branch: input.branch,
        role: input.role as StaffRoleId,
        loginEnabled: input.loginEnabled === true,
        status,
        active: status === "active",
      };

      persistStaff(sortStaffByName([...staffRef.current, member]));
      recordActivity({
        type: "staff-added",
        title: "Staff added",
        description: `${member.name} was added to the ${getSettings().branchNames[input.branch as Branch]} team.`,
      });

      return createStaffValidationResult({}, member);
    },
    [persistStaff]
  );

  const updateStaff = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<Staff, "name" | "branch" | "role" | "loginEnabled" | "status" | "active">
      >
    ) => {
      const normalizedPatch = normalizeStaffPatch(patch);

      persistStaff(
        sortStaffByName(
          staffRef.current.map((member) =>
            member.id === id
              ? {
                  ...member,
                  ...normalizedPatch,
                  name:
                    typeof normalizedPatch.name === "string"
                      ? normalizedPatch.name.trim() || member.name
                      : member.name,
                }
              : member
          )
        )
      );
    },
    [persistStaff]
  );

  const linkStaffAccount = useCallback(
    (staffId: string, userId: string) => {
      const next = linkStaffToUser(staffId, userId);
      staffRef.current = next;
      setStaff(next);
    },
    []
  );

  const unlinkStaffAccount = useCallback((staffId: string) => {
    const next = unlinkStaffUser(staffId);
    staffRef.current = next;
    setStaff(next);
  }, []);

  const deactivateStaff = useCallback(
    (id: string) => {
      updateStaff(id, { status: "inactive", active: false });
    },
    [updateStaff]
  );

  const deleteStaff = useCallback(
    (id: string): StaffValidationResult => {
      if (isStaffReferenced(id)) {
        return createStaffValidationResult({
          form: "Cannot delete a staff member linked to sales, purchases, expenses, or entries.",
        });
      }

      persistStaff(staffRef.current.filter((member) => member.id !== id));
      return createStaffValidationResult({});
    },
    [persistStaff]
  );

  const value = useMemo(
    () => ({
      staff: sortStaffByName(staff),
      activeStaff,
      isLoaded,
      getStaffById,
      getActiveStaffForBranch: getActiveStaffForBranchFn,
      getStaffDisplayName,
      addStaff,
      updateStaff,
      linkStaffAccount,
      unlinkStaffAccount,
      deactivateStaff,
      deleteStaff,
    }),
    [
      staff,
      activeStaff,
      isLoaded,
      getStaffById,
      getActiveStaffForBranchFn,
      getStaffDisplayName,
      addStaff,
      updateStaff,
      linkStaffAccount,
      unlinkStaffAccount,
      deactivateStaff,
      deleteStaff,
    ]
  );

  return (
    <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
}
