"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { useBranches } from "@/context/branches-context";
import type { BranchEntity } from "@/types/branch";

interface BranchDialogProps {
  mode: "add" | "edit";
  branch?: BranchEntity;
  onClose: () => void;
}

export function BranchDialog({ mode, branch, onClose }: BranchDialogProps) {
  const { addBranch, updateBranch } = useBranches();
  const [name, setName] = useState(branch?.name ?? "");
  const [code, setCode] = useState(branch?.code ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [manager, setManager] = useState(branch?.manager ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const input = { name, code, address, phone, manager };
    const result =
      mode === "add" ? addBranch(input) : updateBranch(branch!.id, input);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Add Branch" : "Edit Branch"}
      description="Manage branch details."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="branch-form">
            {mode === "add" ? "Add Branch" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="branch-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder="Branch name"
          />
          <StockFieldError message={errors.name} />
        </div>

        <div>
          <Input
            label="Code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setErrors((current) => ({ ...current, code: undefined }));
            }}
            placeholder="branch-code"
          />
          <StockFieldError message={errors.code} />
        </div>

        <Input
          label="Manager (optional)"
          value={manager}
          onChange={(event) => setManager(event.target.value)}
          placeholder="Branch manager"
        />

        <Input
          label="Phone (optional)"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone number"
        />

        <Textarea
          label="Address (optional)"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Physical address"
        />

        <StockFieldError message={errors.form} />
      </form>
    </StockDialog>
  );
}
