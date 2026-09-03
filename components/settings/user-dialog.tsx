"use client";

import { useMemo, useState } from "react";
import { useFormBranch } from "@/hooks/use-form-branch";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { BranchPicker } from "@/components/entry/branch-picker";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { USER_ROLE_OPTIONS } from "@/lib/auth/permissions";
import { getStaffRoleName } from "@/lib/staff/roles";
import { formatLastLogin } from "@/lib/format";
import { useBranches } from "@/context/branches-context";
import type { AppUser, UserRole } from "@/types/auth";

interface UserDialogProps {
  mode: "add" | "edit";
  user?: AppUser;
  onClose: () => void;
}

interface ReadOnlyFieldProps {
  label: string;
  value: string;
}

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-sm text-zinc-200">{value}</p>
    </div>
  );
}

export function UserDialog({ mode, user, onClose }: UserDialogProps) {
  const { addUser, updateUser } = useAuth();
  const { staff, linkStaffAccount } = useStaff();
  const { getBranchName } = useBranches();
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "cashier");
  const { branch, setBranch } = useFormBranch(user?.branch);
  const [staffId, setStaffId] = useState(user?.staffId ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const staffOptions = useMemo(
    () =>
      staff
        .filter(
          (member) =>
            member.status === "active" &&
            (!member.userId || member.userId === user?.id)
        )
        .map((member) => ({
          value: member.id,
          label: `${member.name} (${getStaffRoleName(member.role)})`,
        })),
    [staff, user?.id]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result =
      mode === "add"
        ? await addUser({
            username,
            displayName,
            role,
            branch,
            password,
            staffId,
          })
        : updateUser(user!.id, {
            displayName,
            role,
            branch,
          });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    if (mode === "add" && result.user?.staffId) {
      linkStaffAccount(
        result.user.staffId,
        result.user.id,
        result.user.username
      );
    }

    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Create User" : "Edit User"}
      description="Every login account must be linked to a staff profile."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form">
            {mode === "add" ? "Create User" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="user-form" className="space-y-4" onSubmit={handleSubmit}>
        {mode === "edit" && user && (
          <div className="grid gap-4 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 sm:grid-cols-2">
            <ReadOnlyField label="Username" value={user.username} />
            <ReadOnlyField label="Branch" value={getBranchName(user.branch)} />
            <ReadOnlyField label="Branch Code" value={user.branchCode} />
            <ReadOnlyField
              label="Role"
              value={USER_ROLE_OPTIONS.find((option) => option.value === user.role)?.label ?? user.role}
            />
            <ReadOnlyField
              label="Status"
              value={user.active ? "Active" : "Disabled"}
            />
            <ReadOnlyField
              label="Login Enabled"
              value={user.loginEnabled ? "Yes" : "No"}
            />
            <ReadOnlyField
              label="Last Login"
              value={formatLastLogin(user.lastLoginAt)}
            />
            <ReadOnlyField
              label="Password Set"
              value={user.passwordSet ? "Yes" : "No"}
            />
          </div>
        )}

        {mode === "add" && (
          <div>
            <Input
              label="Username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setErrors((current) => ({ ...current, username: undefined }));
              }}
              placeholder="username"
            />
            <StockFieldError message={errors.username} />
          </div>
        )}

        <div>
          <Input
            label="Display Name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setErrors((current) => ({ ...current, displayName: undefined }));
            }}
            placeholder="Full name"
          />
          <StockFieldError message={errors.displayName} />
        </div>

        {mode === "add" && (
          <div>
            <Select
              label="Staff Profile"
              value={staffId}
              placeholder="Select staff member"
              options={staffOptions}
              onChange={(event) => {
                setStaffId(event.target.value);
                setErrors((current) => ({ ...current, staffId: undefined }));
              }}
            />
            <StockFieldError message={errors.staffId} />
          </div>
        )}

        <Select
          label="Role"
          value={role}
          options={USER_ROLE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(event) => setRole(event.target.value as UserRole)}
          disabled={mode === "edit" && user?.role === "owner"}
        />
        <StockFieldError message={errors.role} />

        <BranchPicker value={branch} onChange={setBranch} />

        {mode === "add" && (
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
              placeholder="Temporary password"
            />
            <StockFieldError message={errors.password} />
          </div>
        )}

        <StockFieldError message={errors.form} />
      </form>
    </StockDialog>
  );
}

interface ResetPasswordDialogProps {
  user: AppUser;
  onClose: () => void;
}

export function ResetPasswordDialog({
  user,
  onClose,
}: ResetPasswordDialogProps) {
  const { resetUserPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = await resetUserPassword(user.id, password);
    if (!result.success) {
      setErrors(result.errors);
      setSuccessMessage(null);
      return;
    }

    setErrors({});
    setSuccessMessage("✔ Password updated successfully.");
    setIsSubmitting(false);
  }

  return (
    <StockDialog
      title="Reset Password"
      description={`Set a new password for ${user.displayName}.`}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {successMessage ? "Close" : "Cancel"}
          </Button>
          {!successMessage && (
            <Button
              type="submit"
              form="reset-password-form"
              disabled={isSubmitting}
            >
              Reset Password
            </Button>
          )}
        </div>
      }
    >
      <form
        id="reset-password-form"
        className="space-y-4"
        onSubmit={(event) => {
          setIsSubmitting(true);
          void handleSubmit(event).finally(() => setIsSubmitting(false));
        }}
      >
        {successMessage ? (
          <p className="text-sm text-emerald-400">{successMessage}</p>
        ) : (
          <div>
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
            />
            <StockFieldError message={errors.password} />
          </div>
        )}
        <StockFieldError message={errors.form} />
      </form>
    </StockDialog>
  );
}
