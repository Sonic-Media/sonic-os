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
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction } from "@/lib/staff/audit";
import { getTodayISO } from "@/lib/dates";
import { getExpenseRecords } from "@/lib/expenses-module-storage";
import { getPurchases } from "@/lib/purchasing-storage";
import { getSales } from "@/lib/sales-storage";
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
      Pick<
        Staff,
        | "name"
        | "username"
        | "branch"
        | "role"
        | "loginEnabled"
        | "status"
        | "active"
        | "phone"
        | "email"
        | "dailyWage"
        | "monthlySalary"
        | "dateJoined"
        | "emergencyContact"
        | "notes"
      >
    >
  ) => void;
  linkStaffAccount: (staffId: string, userId: string, username?: string) => void;
  unlinkStaffAccount: (staffId: string) => void;
  deactivateStaff: (id: string) => void;
  deleteStaff: (id: string) => StaffValidationResult;
}

const StaffContext = createContext<StaffContextValue | null>(null);

function normalizeStaffPatch(
  patch: Partial<
    Pick<
      Staff,
      | "name"
      | "username"
      | "branch"
      | "role"
      | "loginEnabled"
      | "status"
      | "active"
      | "phone"
      | "email"
      | "dailyWage"
      | "monthlySalary"
      | "dateJoined"
      | "emergencyContact"
      | "notes"
    >
  >
) {
  const next: Partial<Staff> = { ...patch };

  if (typeof patch.name === "string") {
    next.name = patch.name.trim() || undefined;
  }

  if (typeof patch.username === "string") {
    next.username = patch.username.trim() || undefined;
  }

  if (typeof patch.phone === "string") {
    next.phone = patch.phone.trim() || undefined;
  }

  if (typeof patch.email === "string") {
    next.email = patch.email.trim() || undefined;
  }

  if (typeof patch.emergencyContact === "string") {
    next.emergencyContact = patch.emergencyContact.trim() || undefined;
  }

  if (typeof patch.notes === "string") {
    next.notes = patch.notes.trim() || undefined;
  }

  if (typeof patch.dateJoined === "string") {
    next.dateJoined = patch.dateJoined.trim() || undefined;
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
        username: input.username?.trim() || undefined,
        branch: input.branch,
        role: input.role as StaffRoleId,
        loginEnabled: input.loginEnabled === true,
        status,
        active: status === "active",
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        dailyWage:
          typeof input.dailyWage === "number" && input.dailyWage >= 0
            ? input.dailyWage
            : undefined,
        monthlySalary:
          typeof input.monthlySalary === "number" && input.monthlySalary >= 0
            ? input.monthlySalary
            : undefined,
        dateJoined: input.dateJoined?.trim() || getTodayISO(),
        emergencyContact: input.emergencyContact?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
      };

      persistStaff(sortStaffByName([...staffRef.current, member]));
      recordStaffAction({
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        branch: member.branch,
        action: AUDIT_ACTIONS.CREATE,
        module: "staff",
        recordId: member.id,
        newValues: pickAuditFields(member, [
          "id",
          "name",
          "branch",
          "role",
          "status",
        ]),
      });

      return createStaffValidationResult({}, member);
    },
    [persistStaff]
  );

  const updateStaff = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Staff,
          | "name"
          | "username"
          | "branch"
          | "role"
          | "loginEnabled"
          | "status"
          | "active"
          | "phone"
          | "email"
          | "dailyWage"
          | "monthlySalary"
          | "dateJoined"
          | "emergencyContact"
          | "notes"
        >
      >
    ) => {
      const existing = staffRef.current.find((member) => member.id === id);
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

      if (existing) {
        const updated = {
          ...existing,
          ...normalizedPatch,
          name:
            typeof normalizedPatch.name === "string"
              ? normalizedPatch.name.trim() || existing.name
              : existing.name,
        };

        let action: string = AUDIT_ACTIONS.EDIT;
        if (
          normalizedPatch.role &&
          normalizedPatch.role !== existing.role
        ) {
          action = AUDIT_ACTIONS.ROLE_CHANGED;
        } else if (
          normalizedPatch.status === "inactive" &&
          existing.status !== "inactive"
        ) {
          action = AUDIT_ACTIONS.DEACTIVATE;
        } else if (
          normalizedPatch.status === "active" &&
          existing.status !== "active"
        ) {
          action = AUDIT_ACTIONS.ACTIVATE;
        }

        recordStaffAction({
          staffId: existing.id,
          staffName: existing.name,
          role: existing.role,
          branch: existing.branch,
          action,
          module: "staff",
          recordId: existing.id,
          oldValues: pickAuditFields(existing, [
            "name",
            "branch",
            "role",
            "status",
            "dailyWage",
          ]),
          newValues: pickAuditFields(updated, [
            "name",
            "branch",
            "role",
            "status",
            "dailyWage",
          ]),
        });
      }
    },
    [persistStaff]
  );

  const linkStaffAccount = useCallback(
    (staffId: string, userId: string, username?: string) => {
      const next = linkStaffToUser(staffId, userId, username);
      staffRef.current = next;
      setStaff(next);
      const member = next.find((item) => item.id === staffId);
      if (member) {
        recordStaffAction({
          staffId: member.id,
          staffName: member.name,
          role: member.role,
          branch: member.branch,
          action: "Login Linked",
          module: "staff",
          detail: username,
        });
      }
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

      const existing = staffRef.current.find((member) => member.id === id);
      if (existing) {
        recordStaffAction({
          staffId: existing.id,
          staffName: existing.name,
          role: existing.role,
          branch: existing.branch,
          action: AUDIT_ACTIONS.DELETE,
          module: "staff",
          recordId: existing.id,
          oldValues: pickAuditFields(existing, ["id", "name", "branch", "role"]),
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
