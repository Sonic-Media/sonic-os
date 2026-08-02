"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { BranchPicker } from "@/components/entry/branch-picker";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Select } from "@/components/shared/ui/select";
import { useAuth } from "@/context/auth-context";
import { USER_ROLE_OPTIONS } from "@/lib/auth/permissions";
import type { AppUser, UserRole } from "@/types/auth";
import type { Branch } from "@/types";

interface UserDialogProps {
  mode: "add" | "edit";
  user?: AppUser;
  onClose: () => void;
}

export function UserDialog({ mode, user, onClose }: UserDialogProps) {
  const { addUser, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "store-attendant");
  const [branch, setBranch] = useState<Branch>(user?.branch ?? "kansanga");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result =
      mode === "add"
        ? addUser({
            username,
            displayName,
            role,
            branch,
            password,
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

    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Create User" : "Edit User"}
      description="Manage local Sonic OS user access."
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const result = resetUserPassword(user.id, password);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onClose();
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
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form">
            Reset Password
          </Button>
        </div>
      }
    >
      <form id="reset-password-form" className="space-y-4" onSubmit={handleSubmit}>
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
        <StockFieldError message={errors.form} />
      </form>
    </StockDialog>
  );
}
