"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { BRANCH_IDS } from "@/lib/constants";
import type { Branch, Staff } from "@/types";
import { cn } from "@/lib/utils";

function StaffRow({ member }: { member: Staff }) {
  const { getBranchName } = useSettings();
  const { updateStaff, deactivateStaff, deleteStaff } = useStaff();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [branch, setBranch] = useState<Branch>(member.branch);

  function handleSave() {
    if (!name.trim()) return;
    updateStaff(member.id, { name: name.trim(), branch });
    setIsEditing(false);
  }

  function handleCancel() {
    setName(member.name);
    setBranch(member.branch);
    setIsEditing(false);
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${member.name}? Entries linked to this staff member will keep their saved name.`
    );
    if (confirmed) {
      deleteStaff(member.id);
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Branch"
          value={branch}
          options={BRANCH_IDS.map((id) => ({
            value: id,
            label: getBranchName(id),
          }))}
          onChange={(e) => setBranch(e.target.value as Branch)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
      <div>
        <p className="font-medium text-white">{member.name}</p>
        <p className="text-sm text-zinc-500 mt-0.5">{getBranchName(member.branch)}</p>
        {!member.active && (
          <p className="text-xs text-amber-400 mt-1">Inactive</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Edit
        </button>
        {member.active ? (
          <button
            type="button"
            onClick={() => deactivateStaff(member.id)}
            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors"
          >
            Deactivate
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateStaff(member.id, { active: true })}
            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            Activate
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function StaffSection() {
  const { staff, addStaff } = useStaff();
  const { getBranchName } = useSettings();
  const [name, setName] = useState("");
  const [branch, setBranch] = useState<Branch>("salaama");

  const branchOptions = useMemo(
    () =>
      BRANCH_IDS.map((id) => ({
        value: id,
        label: getBranchName(id),
      })),
    [getBranchName]
  );

  function handleAddStaff() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    addStaff({ name: trimmedName, branch });
    setName("");
  }

  return (
    <Card>
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
        Staff
      </h3>

      <div className="space-y-3 mb-4">
        {staff.length === 0 ? (
          <p className="text-sm text-zinc-500">No staff members yet.</p>
        ) : (
          staff.map((member) => <StaffRow key={member.id} member={member} />)
        )}
      </div>

      <div className={cn("space-y-3 border-t border-zinc-800/80 pt-4")}>
        <Input
          label="Add Staff Member"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select
          label="Branch"
          value={branch}
          options={branchOptions}
          onChange={(e) => setBranch(e.target.value as Branch)}
        />
        <Button type="button" className="w-full" onClick={handleAddStaff}>
          Add Staff
        </Button>
      </div>
    </Card>
  );
}
