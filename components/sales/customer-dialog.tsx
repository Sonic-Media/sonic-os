"use client";

import { useState } from "react";
import { StockDialog, StockFieldError } from "@/components/stock/stock-dialog";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Textarea } from "@/components/shared/ui/textarea";
import { useSales } from "@/context/sales-context";
import type { Customer } from "@/types/sales";

interface CustomerDialogProps {
  mode: "add" | "edit";
  customer?: Customer;
  onClose: () => void;
}

export function CustomerDialog({
  mode,
  customer,
  onClose,
}: CustomerDialogProps) {
  const { addCustomer, updateCustomer } = useSales();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const input = {
      name,
      phone,
      email,
      notes,
    };

    const result =
      mode === "add"
        ? addCustomer(input)
        : updateCustomer(customer!.id, input);

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    onClose();
  }

  return (
    <StockDialog
      title={mode === "add" ? "Add Customer" : "Edit Customer"}
      description="Manage customer contact details."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form">
            {mode === "add" ? "Add Customer" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <form id="customer-form" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder="Customer name"
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
