"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { useBranches } from "@/context/branches-context";
import { useStaff } from "@/context/staff-context";
import { STAFF_ROLE_OPTIONS } from "@/lib/staff/roles";
import type { Branch, Staff } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";

interface StaffEditDialogProps {
  member: Staff;
  onClose: () => void;
}

export function StaffEditDialog({ member, onClose }: StaffEditDialogProps) {
  const { updateStaff } = useStaff();
  const { activeBranches } = useBranches();

  const [name, setName] = useState(member.name);
  const [branch, setBranch] = useState<Branch>(member.branch);
  const [role, setRole] = useState<StaffRoleId>(member.role);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [dailyWage, setDailyWage] = useState(
    member.dailyWage != null ? String(member.dailyWage) : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const branchOptions = useMemo(
    () =>
      activeBranches.map((item) => ({
        value: item.code,
        label: item.name,
      })),
    [activeBranches]
  );

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);

    const result = await updateStaff(member.id, {
      name: name.trim(),
      branch,
      role,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      dailyWage: dailyWage ? Number.parseFloat(dailyWage) : undefined,
    });

    setIsSaving(false);

    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to save staff changes.");
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[rgba(8,10,18,0.98)] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Edit Staff</h3>
        <p className="mt-1 text-sm text-zinc-500">{member.name}</p>

        <div className="mt-5 space-y-4">
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value as Branch)}
            options={branchOptions}
          />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRoleId)}
            options={STAFF_ROLE_OPTIONS}
          />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Daily Wage (UGX)"
            type="number"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
