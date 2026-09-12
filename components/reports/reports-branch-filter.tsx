"use client";

import { Select } from "@/components/shared/ui/select";
import { useBranch } from "@/context/branch-context";
import type { ReportsBranchScope } from "@/hooks/use-reports";

interface ReportsBranchFilterProps {
  value: ReportsBranchScope;
  onChange: (value: ReportsBranchScope) => void;
}

export function ReportsBranchFilter({
  value,
  onChange,
}: ReportsBranchFilterProps) {
  const { activeBranches } = useBranch();

  const options = [
    { value: "all", label: "All Branches" },
    ...activeBranches.map((branch) => ({
      value: branch.code,
      label: branch.name,
    })),
  ];

  return (
    <Select
      label="Branch"
      value={value}
      options={options}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
