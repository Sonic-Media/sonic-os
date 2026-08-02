"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { usePurchasing } from "@/context/purchasing-context";
import type { Supplier } from "@/types/purchasing";

interface SupplierDialogProps {
  mode: "add" | "edit";
  supplier?: Supplier;
  onClose: () => void;
}

export function SupplierDialog({
  mode,
  supplier,
  onClose,
}: SupplierDialogProps) {
  const { addSupplier, updateSupplier } = usePurchasing();
  const [name, setName] = useState(supplier?.name ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const input = { name, phone, email, address, notes };
    const result =
      mode === "add"
        ? addSupplier(input)
        : updateSupplier(supplier!.id, input);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Add Supplier" : "Edit Supplier"}
      description="Manage supplier contact details."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form">
            {mode === "add" ? "Add Supplier" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="supplier-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder="Supplier name"
          />
          <StockFieldError message={errors.name} />
        </div>

        <Input
          label="Phone (optional)"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone number"
        />

        <div>
          <Input
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="Email address"
          />
          <StockFieldError message={errors.email} />
        </div>

        <Input
          label="Address (optional)"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Physical address"
        />

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Additional notes"
        />
      </form>
    </StockDialog>
  );
}
