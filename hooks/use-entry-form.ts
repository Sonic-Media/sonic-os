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
import { getDataSourceErrorMessage } from "@/lib/data-source/context-api";
import { getClientSession } from "@/lib/client/session-registry";
import {
  buildStaffActionRecord,
  resolveCurrentStaffAction,
} from "@/lib/staff/session";
import { useActiveBranch } from "@/context/active-branch-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import { useStaff } from "@/context/staff-context";
import { useStaffPaymentsModule } from "@/context/staff-payments-context";
import { useSales } from "@/context/sales-context";
import { useDayClosing } from "@/context/day-closing-context";
import { filterByBranchField } from "@/lib/active-branch/filters";
import { isBranchDayClosed } from "@/lib/day-closing/storage";
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
  const { sales } = useSales();
  const { isLoaded: closingLoaded } = useDayClosing();
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [duplicateEntry, setDuplicateEntry] = useState<Entry | null>(null);
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

  const movieRevenue = parseAmount(form.sales);
  const accessorySales = useMemo(
    () =>
      filterByBranchField(sales, form.branch)
        .filter(
          (sale) => sale.date === form.date && sale.status === "completed"
        )
        .reduce((sum, sale) => sum + sale.total, 0),
    [sales, form.branch, form.date]
  );
  const savingsAllocation = parseAmount(form.savingsAllocation);
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
  const balance = movieRevenue + accessorySales - totalExpenses - staffPayouts;
  const remainingCash = balance - savingsAllocation;
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
      const session = getClientSession();
      if (session?.staffId) {
        const linkedStaff = getStaffById(session.staffId);
        if (linkedStaff) return linkedStaff.name;
      }

      if (!form.staffId) {
        return existing?.staffName ?? "";
      }
      return getStaffById(form.staffId)?.name ?? existing?.staffName ?? "";
    },
    [form.staffId, getStaffById]
  );

  const resolveCreatedBy = useCallback(
    (branch: Branch) => {
      const session = getClientSession();
      if (session?.staffId) {
        const linkedStaff = getStaffById(session.staffId);
        if (linkedStaff) {
          return buildStaffActionRecord(
            linkedStaff,
            new Date().toISOString(),
            branch
          );
        }
      }

      return resolveCurrentStaffAction(branch);
    },
    [getStaffById]
  );

  const buildDraftEntry = useCallback(
    (activeDraftId?: string | null, existing?: Entry) =>
      formToEntry(form, {
        id: activeDraftId ?? undefined,
        status: "draft",
        existing,
        staffName: resolveStaffName(existing),
        createdBy: resolveCreatedBy(form.branch),
      }),
    [form, resolveCreatedBy, resolveStaffName]
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
    setSaveError(null);
    setLastSavedAt(null);
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
    if (
      mode === "today" &&
      closingLoaded &&
      isBranchDayClosed(form.branch, form.date)
    ) {
      return;
    }
    if (saveLockRef.current) return;

    cancelPendingAutosave();

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      if (saveLockRef.current) return;

      saveLockRef.current = true;
      const activeDraftId = resolveActiveDraftId();
      const existing = activeDraftId
        ? entriesRef.current.find((entry) => entry.id === activeDraftId)
        : undefined;
      const entry = buildDraftEntry(activeDraftId, existing);

      void upsertEntry(entry)
        .then((saved) => {
          syncEntriesRef(saved);
          draftIdRef.current = saved.id;
        })
        .catch(() => {
          // Autosave failures surface on explicit save/close actions.
        })
        .finally(() => {
          saveLockRef.current = false;
        });
    }, AUTOSAVE_DEBOUNCE_MS);

    return cancelPendingAutosave;
  }, [
    form,
    isEdit,
    options.entry?.status,
    mode,
    closingLoaded,
    form.branch,
    form.date,
    upsertEntry,
    cancelPendingAutosave,
    resolveActiveDraftId,
    syncEntriesRef,
    buildDraftEntry,
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
      setSaveError(null);
      setLastSavedAt(null);
      return;
    }

    hasInteracted.current = true;
    setHasStarted(true);
    setSaveError(null);
    setLastSavedAt(null);
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
    }
  }

  async function handleSubmitRequest(): Promise<boolean> {
    if (
      mode === "today" &&
      closingLoaded &&
      isBranchDayClosed(form.branch, form.date)
    ) {
      setSaveError("This day is closed. Records cannot be changed.");
      return false;
    }

    if (mode === "today") {
      cancelPendingAutosave();
      setSaveError(null);
      saveLockRef.current = true;
      setIsSaving(true);

      try {
        const activeDraftId = resolveActiveDraftId();
        const existing = activeDraftId
          ? entriesRef.current.find((entry) => entry.id === activeDraftId)
          : undefined;
        const entry = buildDraftEntry(activeDraftId, existing);
        const saved = await upsertEntry(entry);
        syncEntriesRef(saved);
        draftIdRef.current = saved.id;
        setLastSavedAt(Date.now());
        return true;
      } catch (error) {
        setSaveError(getDataSourceErrorMessage(error));
        setLastSavedAt(null);
        return false;
      } finally {
        saveLockRef.current = false;
        setIsSaving(false);
      }
    }
    handleSave();
    return true;
  }

  function handleCancelDuplicate() {
    setDuplicateEntry(null);
    setIsSaving(false);
  }

  function handleEditExisting() {
    if (!duplicateEntry) return;
    setDuplicateEntry(null);
    setIsSaving(false);
    router.push(`/entry/${duplicateEntry.id}/edit`);
  }

  return {
    form,
    isSaving,
    saveError,
    lastSavedAt,
    isEdit,
    isDraftEdit,
    lockBranch,
    mode,
    status: showStatus ? status : undefined,
    sales: movieRevenue,
    movieRevenue,
    accessorySales,
    totalExpenses,
    staffPayouts,
    balance,
    remainingCash,
    savingsAllocation,
    duplicateEntry,
    updateField,
    handleSave,
    handleSubmitRequest,
    handleEditExisting,
    handleCancelDuplicate,
    seedCommonExpenses: !isEdit,
  };
}
