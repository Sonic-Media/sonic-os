"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResetPasswordDialog, UserDialog } from "@/components/settings/user-dialog";
import { UsersTable } from "@/components/settings/users-table";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useAuth } from "@/context/auth-context";
import type { AppUser } from "@/types/auth";

export default function SettingsUsersPage() {
  const router = useRouter();
  const {
    users,
    isLoaded,
    canManageUsers,
    disableUser,
    enableUser,
  } = useAuth();
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (isLoaded && !canManageUsers) {
      router.replace("/settings");
    }
  }, [isLoaded, canManageUsers, router]);

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (!canManageUsers) {
    return null;
  }

  function openAddUser() {
    setSelectedUser(null);
    setDialogMode("add");
  }

  function openEditUser(user: AppUser) {
    setSelectedUser(user);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedUser(null);
  }

  function handleDisable(user: AppUser) {
    const confirmed = window.confirm(`Disable ${user.displayName}?`);
    if (!confirmed) return;

    const result = disableUser(user.id);
    if (!result.success) {
      window.alert(result.errors.form ?? "Unable to disable this user.");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        subtitle="Create users, assign roles, and manage local access"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={openAddUser}>
          Create User
        </Button>
      </div>

      <UsersTable
        users={users}
        onEdit={openEditUser}
        onResetPassword={setResetUser}
        onDisable={handleDisable}
        onEnable={(user) => enableUser(user.id)}
      />

      {dialogMode === "add" && <UserDialog mode="add" onClose={closeDialog} />}

      {dialogMode === "edit" && selectedUser && (
        <UserDialog mode="edit" user={selectedUser} onClose={closeDialog} />
      )}

      {resetUser && (
        <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />
      )}
    </PageContainer>
  );
}
