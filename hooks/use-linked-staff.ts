"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchLinkedStaffMe } from "@/lib/api/staff";
import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import type { Branch, Staff } from "@/types";

function isActiveStaffForBranch(member: Staff, branch: Branch): boolean {
  return (
    member.active !== false &&
    branchCodesReferToSameInventory(member.branch, branch)
  );
}

function resolveLinkedStaffFromList(
  staff: Staff[],
  session: { userId: string; staffId?: string } | null | undefined,
  branch: Branch
): Staff | undefined {
  if (!session) return undefined;

  if (session.staffId) {
    const byId = staff.find((member) => member.id === session.staffId);
    if (byId && isActiveStaffForBranch(byId, branch)) {
      return byId;
    }
  }

  return staff.find(
    (member) =>
      member.userId === session.userId && isActiveStaffForBranch(member, branch)
  );
}

export function useLinkedStaff(branch: Branch) {
  const { session } = useAuth();
  const { staff, getStaffById, isLoaded: staffLoaded } = useStaff();
  const [remoteStaff, setRemoteStaff] = useState<Staff | undefined>();
  const [isResolving, setIsResolving] = useState(false);

  const staffFromList = useMemo(
    () => resolveLinkedStaffFromList(staff, session, branch),
    [branch, session, staff]
  );

  const staffFromSessionId = useMemo(() => {
    if (!session?.staffId) return undefined;
    const member = getStaffById(session.staffId);
    if (!member || !isActiveStaffForBranch(member, branch)) {
      return undefined;
    }
    return member;
  }, [branch, getStaffById, session?.staffId]);

  useEffect(() => {
    if (staffFromList || staffFromSessionId) {
      setRemoteStaff(undefined);
      setIsResolving(false);
      return;
    }

    if (!session || !staffLoaded) {
      setRemoteStaff(undefined);
      setIsResolving(!staffLoaded);
      return;
    }

    let cancelled = false;
    setIsResolving(true);

    void fetchLinkedStaffMe()
      .then((member) => {
        if (cancelled) return;
        setRemoteStaff(
          isActiveStaffForBranch(member, branch) ? member : undefined
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteStaff(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [branch, session, staffFromList, staffFromSessionId, staffLoaded]);

  const linkedStaff =
    staffFromList ?? staffFromSessionId ?? remoteStaff ?? undefined;

  return {
    linkedStaff,
    isLoaded: staffLoaded && !isResolving,
  };
}
