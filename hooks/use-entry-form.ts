"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants";
import {
  calculateExpenses,
  parseAmount,
} from "@/lib/amounts";
import {
  entryToForm,
  findCompletedEntryForBranchDate,
  findDraftForBranchDate,
  formToEntry,
} from "@/lib/entry-helpers";
import { createDefaultExpenses } from "@/lib/expenses";
import { getTodayISO } from "@/lib/dates";
import { upsertEntryInList } from "@/lib/storage";
import { useActiveBranch } from "@/context/active-branch-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import { useStaff } from "@/context/staff-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { computeStaffPayoutTotalForBranchDate } from "@/lib/staff-payments/calculations";
import type { Branch, Entry, EntryFormData, Expense } from "@/types";

function createBlankForm(
  branch: Branch,
  templateExpenses: Expense[],
  date = getTodayISO()
): EntryFormData {
  return {
    date,
    branch,
    sales: "",
    expenses: createDefaultExpenses(templateExpenses),
    staffId: "",
    notes: "",
    savingsAllocation: "",
  };
}

export type OperationsMode = "today" | "historical";

interface UseEntryFormOptions {
  entry?: Entry;
  redirectTo?: string;
  initialBranch?: Branch;
  initialDate?: string;
  lockBranch?: boolean;
  lockDate?: boolean;
  mode?: OperationsMode;
}

export function useEntryForm(options: UseEntryFormOptions = {}) {
  const router = useRouter();
  const { entries, upsertEntry } = useEntriesContext();
  const { activeTemplateExpenses } = useExpenseTemplates();
  const { getStaffById } = useStaff();
  const { payments } = useStaffPaymentsModule();
  const { activeBranch, isLoaded: activeBranchLoaded } = useActiveBranch();
  const isEdit = !!options.entry;
  const isDraftEdit = isEdit && options.entry?.status === "draft";
  const lockBranch =
    options.lockBranch ?? (isEdit && options.entry?.status === "completed");
  const [form, setForm] = useState<EntryFormData>(() =>
    options.entry
      ? entryToForm(options.entry)
      : createBlankForm(
          options.initialBranch ?? activeBranch,
          activeTemplateExpenses,
          options.initialDate ?? getTodayISO()
        )
  );
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState<Entry | null>(null);
  const [showCloseDayDialog, setShowCloseDayDialog] = useState(false);
  const [hasStarted, setHasStarted] = useState(isEdit);
  const hasInteracted = useRef(isEdit);
  const draftIdRef = useRef<string | null>(
    isDraftEdit ? options.entry!.id : null
  );
  const entriesRef = useRef(entries);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveLockRef = useRef(false);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const sales = parseAmount(form.sales);
  const totalExpenses = calculateExpenses(form);
  const staffPayouts = useMemo(
    () =>
      computeStaffPayoutTotalForBranchDate(
        payments,
        form.branch,
        form.date
      ),
    [payments, form.branch, form.date]
  );
  const balance = sales - totalExpenses - staffPayouts;
  const mode = options.mode ?? "today";
  const status = isEdit ? options.entry!.status : "draft";
  const showStatus = isEdit || hasStarted;

  const cancelPendingAutosave = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const syncEntriesRef = useCallback((entry: Entry) => {
    entriesRef.current = upsertEntryInList(entriesRef.current, entry);
  }, []);

  const resolveActiveDraftId = useCallback((): string | null => {
    const branchDraft = findDraftForBranchDate(
      entriesRef.current,
      form.branch,
      form.date
    );
    if (branchDraft) {
      return branchDraft.id;
    }

    const currentId = draftIdRef.current;
    if (!currentId) {
      return null;
    }

    const current = entriesRef.current.find((entry) => entry.id === currentId);
    if (
      current?.branch === form.branch &&
      current.date === form.date &&
      current.status === "draft"
    ) {
      return currentId;
    }

    return null;
  }, [form.branch, form.date]);

  const resolveStaffName = useCallback(
    (existing?: Entry) => {
      if (!form.staffId) {
        return existing?.staffName ?? "";
      }
      return getStaffById(form.staffId)?.name ?? existing?.staffName ?? "";
    },
    [form.staffId, getStaffById]
  );


  function promoteToCompletedSync(
    entryId: string,
    existing?: Entry,
    formData: EntryFormData = form
  ): Entry {
    const completed = formToEntry(formData, {
      id: entryId,
      status: "completed",
      existing,
      staffName: resolveStaffName(existing),
    });
    upsertEntry(completed);
    syncEntriesRef(completed);
    draftIdRef.current = entryId;
    return completed;
  }

  function switchBranch(nextBranch: Branch) {
    cancelPendingAutosave();

    const branchDraft = findDraftForBranchDate(
      entriesRef.current,
      nextBranch,
      form.date
    );

    if (branchDraft) {
      draftIdRef.current = branchDraft.id;
      setForm(entryToForm(branchDraft));
    } else {
      const completed = findCompletedEntryForBranchDate(
        entriesRef.current,
        nextBranch,
        form.date
      );
      if (completed && mode === "today") {
        draftIdRef.current = completed.id;
        setForm(entryToForm(completed));
      } else {
        draftIdRef.current = null;
        setForm(createBlankForm(nextBranch, activeTemplateExpenses, form.date));
      }
    }

    hasInteracted.current = true;
    setHasStarted(true);
  }

  useEffect(() => {
    if (!activeBranchLoaded) return;
    if (isEdit && options.entry?.status === "completed") return;
    if (form.branch === activeBranch) return;
    switchBranch(activeBranch);
  }, [activeBranch, activeBranchLoaded, form.branch, isEdit, options.entry?.status]);

  useEffect(() => {
    if (!hasInteracted.current) return;
    if (isEdit && options.entry?.status === "completed") return;
    if (saveLockRef.current) return;

    cancelPendingAutosave();

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      if (saveLockRef.current) return;

      saveLockRef.current = true;
      try {
        const activeDraftId = resolveActiveDraftId();
        const existing = activeDraftId
          ? entriesRef.current.find((entry) => entry.id === activeDraftId)
          : undefined;
        const entry = formToEntry(form, {
          id: activeDraftId ?? undefined,
          status: "draft",
          existing,
          staffName: resolveStaffName(existing),
        });

        upsertEntry(entry);
        syncEntriesRef(entry);
        draftIdRef.current = entry.id;
      } finally {
        saveLockRef.current = false;
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return cancelPendingAutosave;
  }, [
    form,
    isEdit,
    options.entry?.status,
    upsertEntry,
    cancelPendingAutosave,
    resolveActiveDraftId,
    syncEntriesRef,
    resolveStaffName,
  ]);

  function updateField<K extends keyof EntryFormData>(
    key: K,
    value: EntryFormData[K]
  ) {
    if (key === "branch" && value !== form.branch) {
      if (lockBranch) {
        return;
      }
      switchBranch(value as Branch);
      return;
    }

    if (key === "date" && value !== form.date && !options.lockDate) {
      cancelPendingAutosave();
      const nextDate = value as string;
      const branchDraft = findDraftForBranchDate(
        entriesRef.current,
        form.branch,
        nextDate
      );
      if (branchDraft) {
        draftIdRef.current = branchDraft.id;
        setForm(entryToForm(branchDraft));
      } else {
        draftIdRef.current = null;
        setForm(
          createBlankForm(form.branch, activeTemplateExpenses, nextDate)
        );
      }
      hasInteracted.current = true;
      setHasStarted(true);
      return;
    }

    hasInteracted.current = true;
    setHasStarted(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    cancelPendingAutosave();
    saveLockRef.current = true;
    setIsSaving(true);

    try {
      const formWithAllocation = {
        ...form,
        savingsAllocation:
          form.savingsAllocation.trim() === ""
            ? String(balance)
            : form.savingsAllocation,
      };

      let entryId =
        resolveActiveDraftId() ??
        draftIdRef.current ??
        options.entry?.id ??
        null;
      const conflict = findCompletedEntryForBranchDate(
        entriesRef.current,
        formWithAllocation.branch,
        formWithAllocation.date,
        entryId ?? undefined
      );

      if (conflict && !(options.entry?.id === conflict.id)) {
        setDuplicateEntry(conflict);
        setIsSaving(false);
        return;
      }

      const existing = entryId
        ? entriesRef.current.find((entry) => entry.id === entryId)
        : undefined;

      const shouldPersistDraft =
        hasInteracted.current && (!existing || existing.status === "draft");

      if (shouldPersistDraft) {
        entryId = entryId ?? crypto.randomUUID();
        const draft = formToEntry(formWithAllocation, {
          id: entryId,
          status: "draft",
          existing,
          staffName: resolveStaffName(existing),
        });
        upsertEntry(draft);
        syncEntriesRef(draft);
        draftIdRef.current = entryId;
      }

      const recordId = entryId ?? crypto.randomUUID();
      const promoteFrom = entriesRef.current.find(
        (entry) => entry.id === recordId
      );

      promoteToCompletedSync(recordId, promoteFrom ?? existing, formWithAllocation);

      const redirect =
        options.redirectTo ??
        (mode === "today" ? "/operations/today" : "/history");
      router.push(
        mode === "today"
          ? "/operations/today"
          : redirect
      );
    } finally {
      saveLockRef.current = false;
      setShowCloseDayDialog(false);
    }
  }

  function handleSubmitRequest() {
    if (mode === "today") {
      setShowCloseDayDialog(true);
      setIsSaving(false);
      return;
    }
    handleSave();
  }

  function handleConfirmCloseDay() {
    handleSave();
  }

  function handleCancelCloseDay() {
    setShowCloseDayDialog(false);
  }

  function handleEditExisting() {
    if (!duplicateEntry) return;
    setDuplicateEntry(null);
    setIsSaving(false);
    router.push(`/entry/${duplicateEntry.id}/edit`);
  }

  function handleCancelDuplicate() {
    setDuplicateEntry(null);
    setIsSaving(false);
  }

  return {
    form,
    isSaving,
    isEdit,
    isDraftEdit,
    lockBranch,
    mode,
    status: showStatus ? status : undefined,
    sales,
    totalExpenses,
    staffPayouts,
    balance,
    duplicateEntry,
    showCloseDayDialog,
    updateField,
    handleSave,
    handleSubmitRequest,
    handleConfirmCloseDay,
    handleCancelCloseDay,
    handleEditExisting,
    handleCancelDuplicate,
    seedCommonExpenses: !isEdit,
  };
}
