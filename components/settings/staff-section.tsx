"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { useAuth } from "@/context/auth-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { useBranches } from "@/context/branches-context";
import { useFormBranch } from "@/hooks/use-form-branch";
import { STAFF_ROLE_OPTIONS, getStaffRoleName } from "@/lib/staff/roles";
import type { Branch, Staff } from "@/types";
import type { StaffRoleId } from "@/types/staff-role";
import { cn } from "@/lib/utils";

function StaffRow({ member }: { member: Staff }) {
  const { getBranchName } = useSettings();
  const { activeBranches } = useBranches();
  const { canManageUsers } = useAuth();
  const { updateStaff, deactivateStaff, deleteStaff } = useStaff();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [branch, setBranch] = useState<Branch>(member.branch);
  const [role, setRole] = useState<StaffRoleId>(member.role);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [dailyWage, setDailyWage] = useState(
    member.dailyWage != null ? String(member.dailyWage) : ""
  );
  const [monthlySalary, setMonthlySalary] = useState(
    member.monthlySalary != null ? String(member.monthlySalary) : ""
  );
  const [dateJoined, setDateJoined] = useState(member.dateJoined);
  const [emergencyContact, setEmergencyContact] = useState(
    member.emergencyContact ?? ""
  );
  const [notes, setNotes] = useState(member.notes ?? "");

  const branchOptions = useMemo(
    () =>
      activeBranches.map((item) => ({
        value: item.code,
        label: item.name,
      })),
    [activeBranches]
  );

  function handleSave() {
    if (!name.trim()) return;
    updateStaff(member.id, {
      name: name.trim(),
      branch,
      role,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      dailyWage: dailyWage ? Number.parseFloat(dailyWage) : undefined,
      monthlySalary: monthlySalary ? Number.parseFloat(monthlySalary) : undefined,
      dateJoined: dateJoined.trim() || member.dateJoined,
      emergencyContact: emergencyContact.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setName(member.name);
    setBranch(member.branch);
    setRole(member.role);
    setPhone(member.phone ?? "");
    setEmail(member.email ?? "");
    setDailyWage(member.dailyWage != null ? String(member.dailyWage) : "");
    setMonthlySalary(
      member.monthlySalary != null ? String(member.monthlySalary) : ""
    );
    setDateJoined(member.dateJoined);
    setEmergencyContact(member.emergencyContact ?? "");
    setNotes(member.notes ?? "");
    setIsEditing(false);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete ${member.name}? This cannot be undone.`
    );
    if (!confirmed) return;

    const result = await deleteStaff(member.id);
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to delete this staff member.");
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
          options={branchOptions}
          onChange={(e) => setBranch(e.target.value as Branch)}
        />
        <Select
          label="Role"
          value={role}
          options={STAFF_ROLE_OPTIONS}
          onChange={(e) => setRole(e.target.value as StaffRoleId)}
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Daily Wage"
          type="number"
          value={dailyWage}
          onChange={(e) => setDailyWage(e.target.value)}
        />
        <Input
          label="Monthly Salary (optional)"
          type="number"
          value={monthlySalary}
          onChange={(e) => setMonthlySalary(e.target.value)}
        />
        <Input
          label="Date Joined"
          type="date"
          value={dateJoined}
          onChange={(e) => setDateJoined(e.target.value)}
        />
        <Input
          label="Emergency Contact (optional)"
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
        <p className="text-sm text-zinc-500 mt-0.5">
          {getBranchName(member.branch)} · {getStaffRoleName(member.role)}
          {member.phone ? ` · ${member.phone}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span
            className={cn(
              member.status === "active" ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {member.status === "active" ? "Active" : "Inactive"}
          </span>
          {member.loginEnabled && (
            <span className="text-zinc-400">Login enabled</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Edit
        </button>
        {member.status === "active" ? (
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
            onClick={() => updateStaff(member.id, { status: "active", active: true })}
            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            Activate
          </button>
        )}
        {canManageUsers && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-2 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function StaffSection() {
  const { staff, addStaff, linkStaffAccount } = useStaff();
  const { addUser } = useAuth();
  const { activeBranches } = useBranches();

  const [name, setName] = useState("");
  const { branch, setBranch, isReady: branchReady } = useFormBranch();
  const [role, setRole] = useState<StaffRoleId>("cashier");
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const branchOptions = useMemo(
    () =>
      activeBranches.map((item) => ({
        value: item.code,
        label: item.name,
      })),
    [activeBranches]
  );

  async function handleAddStaff() {
    setErrors({});

    const trimmedName = name.trim();
    const nextErrors: Record<string, string | undefined> = {};

    if (!trimmedName) {
      nextErrors.name = "Name is required.";
    }

    if (!branch) {
      nextErrors.branch = "Branch is required.";
    }

    if (!role) {
      nextErrors.role = "Role is required.";
    }

    if (loginEnabled) {
      if (!username.trim()) {
        nextErrors.username = "Username is required when login is enabled.";
      }
      if (!password.trim()) {
        nextErrors.password = "Password is required when login is enabled.";
      }
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    const staffResult = await addStaff({
      name: trimmedName,
      branch,
      role,
      loginEnabled: false,
      status: "active",
    });

    if (!staffResult.success || !staffResult.staff) {
      setErrors(staffResult.errors);
      return;
    }

    if (loginEnabled) {
      const userResult = await addUser({
        username,
        displayName: trimmedName,
        role,
        branch,
        password,
        staffId: staffResult.staff.id,
      });

      if (!userResult.success || !userResult.user) {
        setErrors(userResult.errors);
        return;
      }

      linkStaffAccount(
        staffResult.staff.id,
        userResult.user.id,
        username.trim().toLowerCase()
      );
    }

    setName("");
    setUsername("");
    setPassword("");
    setLoginEnabled(false);
    setErrors({});
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
        <StockFieldError message={errors.name} />

        <Select
          label="Branch"
          value={branch}
          options={branchOptions}
          onChange={(e) => setBranch(e.target.value as Branch)}
        />
        <StockFieldError message={errors.branch} />

        <Select
          label="Role"
          value={role}
          options={STAFF_ROLE_OPTIONS}
          onChange={(e) => setRole(e.target.value as StaffRoleId)}
        />
        <StockFieldError message={errors.role} />

        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={loginEnabled}
            onChange={(event) => setLoginEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
          />
          Enable login for this staff member
        </label>

        {loginEnabled && (
          <>
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
            <StockFieldError message={errors.username} />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
            />
            <StockFieldError message={errors.password} />
          </>
        )}

        <StockFieldError message={errors.form} />

        <Button
          type="button"
          className="w-full"
          onClick={handleAddStaff}
          disabled={!branchReady}
        >
          Add Staff
        </Button>
      </div>
    </Card>
  );
}

function StockFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}
