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
  createStaffApi,
  deleteStaffApi,
  fetchStaff,
  linkStaffUserApi,
  unlinkStaffUserApi,
  updateStaffApi,
} from "@/lib/api/staff";
import { useAuth } from "@/context/auth-context";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import {
  buildStaffLookup,
  getActiveStaffForBranch,
  normalizeStaffList,
  resolveStaffDisplayName,
  sortStaffByName,
} from "@/lib/staff-storage";
import { isStaffRoleId } from "@/lib/staff/roles";
import { AUDIT_ACTIONS } from "@/lib/audit-log/constants";
import { pickAuditFields } from "@/lib/audit-log/snapshots";
import { recordStaffAction, setStaffListCache } from "@/lib/staff/audit";
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

interface StaffContextValue {
  staff: Staff[];
  activeStaff: Staff[];
  isLoaded: boolean;
  loadError: string | null;
  getStaffById: (id: string) => Staff | undefined;
  getActiveStaffForBranch: (branch: Branch) => Staff[];
  getStaffDisplayName: (staffId: string, fallbackName?: string) => string;
  addStaff: (input: StaffInput) => Promise<StaffValidationResult>;
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
  deleteStaff: (id: string) => Promise<StaffValidationResult>;
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
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const wasAuthenticated = useRef(false);
  const staffRef = useRef(staff);

  useEffect(() => {
    staffRef.current = staff;
    setStaffListCache(staff);
  }, [staff]);

  const refreshStaffFromApi = useCallback(async () => {
    const remoteStaff = await fetchStaff();
    const normalized = normalizeStaffList(remoteStaff);
    staffRef.current = normalized;
    setStaff(normalized);
    setStaffListCache(normalized);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (isAuthenticated && !wasAuthenticated.current) {
      hasLoaded.current = false;
    }
    wasAuthenticated.current = isAuthenticated;

    if (hasLoaded.current && !isAuthenticated) {
      staffRef.current = [];
      setStaff([]);
      setStaffListCache([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (!isAuthenticated) {
      staffRef.current = [];
      setStaff([]);
      setStaffListCache([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshStaffFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, refreshStaffFromApi]);

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
    async (input: StaffInput): Promise<StaffValidationResult> => {
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

      try {
        const member = await runOnApi(() => createStaffApi(input));
        await refreshStaffFromApi();

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
      } catch (error) {
        return createStaffValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [refreshStaffFromApi]
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

      void (async () => {
        try {
          await runOnApi(async () => {
            await updateStaffApi(id, normalizedPatch);
            await refreshStaffFromApi();
          });

          if (existing) {
            const updated = staffRef.current.find((member) => member.id === id);
            if (!updated) return;

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
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshStaffFromApi]
  );

  const linkStaffAccount = useCallback(
    (staffId: string, userId: string, username?: string) => {
      void (async () => {
        try {
          await runOnApi(async () => {
            await linkStaffUserApi(staffId, { userId, username });
            await refreshStaffFromApi();
          });

          const member = staffRef.current.find((item) => item.id === staffId);
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
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshStaffFromApi]
  );

  const unlinkStaffAccount = useCallback(
    (staffId: string) => {
      void (async () => {
        try {
          await runOnApi(async () => {
            await unlinkStaffUserApi(staffId);
            await refreshStaffFromApi();
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshStaffFromApi]
  );

  const deactivateStaff = useCallback(
    (id: string) => {
      updateStaff(id, { status: "inactive", active: false });
    },
    [updateStaff]
  );

  const deleteStaff = useCallback(
    async (id: string): Promise<StaffValidationResult> => {
      const existing = staffRef.current.find((member) => member.id === id);
      if (!existing) {
        return createStaffValidationResult({ form: "Staff member not found." });
      }

      try {
        await runOnApi(async () => {
          recordStaffAction({
            staffId: existing.id,
            staffName: existing.name,
            role: existing.role,
            branch: existing.branch,
            action: AUDIT_ACTIONS.DELETE,
            module: "staff",
            recordId: existing.id,
            oldValues: pickAuditFields(existing, [
              "id",
              "name",
              "branch",
              "role",
            ]),
          });

          await deleteStaffApi(id);
          await refreshStaffFromApi();
        });

        return createStaffValidationResult({});
      } catch (error) {
        return createStaffValidationResult({
          form: getDataSourceErrorMessage(error),
        });
      }
    },
    [refreshStaffFromApi]
  );

  const value = useMemo(
    () => ({
      staff: sortStaffByName(staff),
      activeStaff,
      isLoaded,
      loadError,
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
      loadError,
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
