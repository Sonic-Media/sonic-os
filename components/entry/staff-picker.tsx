"use client";

import { Select } from "@/components/shared/ui/select";
import { useStaff } from "@/context/staff-context";
import type { Branch } from "@/types";

interface StaffPickerProps {
  branch: Branch;
  value: string;
  onChange: (staffId: string) => void;
}

export function StaffPicker({ branch, value, onChange }: StaffPickerProps) {
  const { getActiveStaffForBranch, getStaffById } = useStaff();
  const branchStaff = getActiveStaffForBranch(branch);
  const options = branchStaff.map((member) => ({
    value: member.id,
    label: member.name,
  }));

  if (value && !options.some((option) => option.value === value)) {
    const current = getStaffById(value);
    if (current) {
      options.unshift({
        value: current.id,
        label: current.active ? current.name : `${current.name} (Inactive)`,
      });
    }
  }

  return (
    <Select
      label="Staff"
      placeholder="Select Staff"
      value={value}
      options={options}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
