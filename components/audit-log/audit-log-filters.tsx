"use client";

import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_MODULE_OPTIONS,
} from "@/lib/audit-log/constants";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import type { AuditLogFilterCriteria } from "@/types/audit-log";
import type { Branch } from "@/types";

interface AuditLogFiltersProps {
  criteria: AuditLogFilterCriteria;
  onCriteriaChange: (patch: Partial<AuditLogFilterCriteria>) => void;
}

export function AuditLogFilters({
  criteria,
  onCriteriaChange,
}: AuditLogFiltersProps) {
  const { branches } = useSettings();
  const { staff } = useStaff();

  const branchOptions = [
    { value: "all", label: "All Branches" },
    ...branches.map((branch) => ({
      value: branch.id,
      label: branch.name,
    })),
  ];

  const staffOptions = [
    { value: "all", label: "All Staff" },
    ...staff.map((member) => ({
      value: member.id,
      label: member.name,
    })),
  ];

  return (
    <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Input
        label="From"
        type="date"
        value={criteria.dateStart}
        onChange={(event) =>
          onCriteriaChange({ dateStart: event.target.value })
        }
      />
      <Input
        label="To"
        type="date"
        value={criteria.dateEnd}
        onChange={(event) => onCriteriaChange({ dateEnd: event.target.value })}
      />
      <Select
        label="Branch"
        value={criteria.branch}
        options={branchOptions}
        onChange={(event) =>
          onCriteriaChange({
            branch: event.target.value as Branch | "all",
          })
        }
      />
      <Select
        label="Staff"
        value={criteria.staffId}
        options={staffOptions}
        onChange={(event) =>
          onCriteriaChange({ staffId: event.target.value })
        }
      />
      <Select
        label="Module"
        value={criteria.module}
        options={AUDIT_MODULE_OPTIONS}
        onChange={(event) =>
          onCriteriaChange({
            module: event.target.value as AuditLogFilterCriteria["module"],
          })
        }
      />
      <Select
        label="Action"
        value={criteria.action}
        options={AUDIT_ACTION_OPTIONS}
        onChange={(event) =>
          onCriteriaChange({ action: event.target.value })
        }
      />
    </section>
  );
}
