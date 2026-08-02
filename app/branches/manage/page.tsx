"use client";

import { useState } from "react";
import { BranchDialog } from "@/components/branches/branch-dialog";
import { BranchesSubnav } from "@/components/branches/branches-subnav";
import { BranchesTable } from "@/components/branches/branches-table";
import { Button } from "@/components/shared/ui/button";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { useBranches } from "@/context/branches-context";
import type { BranchEntity } from "@/types/branch";

export default function BranchesManagePage() {
  const { branches, isLoaded, deactivateBranch, reactivateBranch } =
    useBranches();
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchEntity | null>(
    null
  );

  function openAddBranch() {
    setSelectedBranch(null);
    setDialogMode("add");
  }

  function openEditBranch(branch: BranchEntity) {
    setSelectedBranch(branch);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedBranch(null);
  }

  function handleDeactivate(branch: BranchEntity) {
    const confirmed = window.confirm(
      `Deactivate ${branch.name}? It will be hidden from branch selectors.`
    );
    if (confirmed) {
      deactivateBranch(branch.id);
    }
  }

  function handleReactivate(branch: BranchEntity) {
    reactivateBranch(branch.id);
  }

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Manage Branches"
        subtitle="Add, edit, and control branch availability"
      />

      <div className="mb-6 flex justify-end">
        <Button type="button" onClick={openAddBranch}>
          Add Branch
        </Button>
      </div>

      <BranchesSubnav />

      <BranchesTable
        branches={branches}
        onEdit={openEditBranch}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
      />

      {dialogMode === "add" && <BranchDialog mode="add" onClose={closeDialog} />}

      {dialogMode === "edit" && selectedBranch && (
        <BranchDialog
          mode="edit"
          branch={selectedBranch}
          onClose={closeDialog}
        />
      )}
    </PageContainer>
  );
}
