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
  normalizeStaffList,
  resolveStaffDisplayName,
  saveStaffList,
  sortStaffByName,
} from "@/lib/staff-storage";
import { recordActivity } from "@/lib/activity-log";
import { getSettings } from "@/lib/settings-storage";
import type { Branch, Staff } from "@/types";

interface StaffContextValue {
  staff: Staff[];
  activeStaff: Staff[];
  isLoaded: boolean;
  getStaffById: (id: string) => Staff | undefined;
  getActiveStaffForBranch: (branch: Branch) => Staff[];
  getStaffDisplayName: (staffId: string, fallbackName?: string) => string;
  addStaff: (input: { name: string; branch: Branch }) => Staff;
  updateStaff: (
    id: string,
    patch: Partial<Pick<Staff, "name" | "branch" | "active">>
  ) => void;
  deactivateStaff: (id: string) => void;
  deleteStaff: (id: string) => void;
}

const StaffContext = createContext<StaffContextValue | null>(null);

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
    () => staff.filter((member) => member.active),
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
    (input: { name: string; branch: Branch }) => {
      const member: Staff = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        branch: input.branch,
        active: true,
      };
      persistStaff(sortStaffByName([...staffRef.current, member]));
      recordActivity({
        type: "staff-added",
        title: "Staff added",
        description: `${member.name} was added to the ${getSettings().branchNames[input.branch]} team.`,
      });
      return member;
    },
    [persistStaff]
  );

  const updateStaff = useCallback(
    (
      id: string,
      patch: Partial<Pick<Staff, "name" | "branch" | "active">>
    ) => {
      persistStaff(
        sortStaffByName(
          staffRef.current.map((member) =>
            member.id === id
              ? {
                  ...member,
                  ...patch,
                  name:
                    typeof patch.name === "string"
                      ? patch.name.trim() || member.name
                      : member.name,
                }
              : member
          )
        )
      );
    },
    [persistStaff]
  );

  const deactivateStaff = useCallback(
    (id: string) => {
      updateStaff(id, { active: false });
    },
    [updateStaff]
  );

  const deleteStaff = useCallback(
    (id: string) => {
      persistStaff(staffRef.current.filter((member) => member.id !== id));
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
