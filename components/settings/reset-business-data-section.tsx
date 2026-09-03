"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import {
  previewBusinessDataResetApi,
  resetBusinessDataApi,
  type BusinessResetPreviewResponse,
} from "@/lib/api/business-reset";
import { isApiError } from "@/lib/api/errors";
import {
  BUSINESS_DATA_RESET_CONFIRMATION,
} from "@/lib/data-protection/constants";
import {
  BUSINESS_RESET_CATEGORIES,
  BUSINESS_RESET_CATEGORY_LABELS,
  expandBusinessResetSelection,
  type BusinessResetCategory,
} from "@/lib/business-reset/categories";
import { isProductionModeClient } from "@/lib/env/production-mode-client";
import { useAppDataRefresh } from "@/hooks/use-app-data-refresh";

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function createDefaultSelection(): Record<BusinessResetCategory, boolean> {
  return Object.fromEntries(
    BUSINESS_RESET_CATEGORIES.map((category) => [category, true])
  ) as Record<BusinessResetCategory, boolean>;
}

export function ResetBusinessDataSection() {
  const { refreshAll } = useAppDataRefresh();
  const [preview, setPreview] = useState<BusinessResetPreviewResponse | null>(
    null
  );
  const [selection, setSelection] =
    useState<Record<BusinessResetCategory, boolean>>(createDefaultSelection);
  const [confirmation, setConfirmation] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const productionMode = isProductionModeClient();

  const selectedCategories = useMemo(
    () =>
      BUSINESS_RESET_CATEGORIES.filter((category) => selection[category]),
    [selection]
  );

  const expandedCategories = useMemo(
    () => expandBusinessResetSelection(selectedCategories),
    [selectedCategories]
  );

  const autoIncludedCategories = useMemo(
    () =>
      expandedCategories.filter(
        (category) => !selectedCategories.includes(category)
      ),
    [expandedCategories, selectedCategories]
  );

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const nextPreview = await previewBusinessDataResetApi();
      setPreview(nextPreview);
    } catch (caught) {
      setError(resolveErrorMessage(caught, "Could not load reset preview."));
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  function toggleCategory(category: BusinessResetCategory) {
    setSelection((current) => ({
      ...current,
      [category]: !current[category],
    }));
    setSuccess(null);
  }

  async function handleReset() {
    if (selectedCategories.length === 0) {
      setError("Select at least one category to reset.");
      return;
    }

    if (confirmation.trim() !== BUSINESS_DATA_RESET_CONFIRMATION) {
      setError(`Type "${BUSINESS_DATA_RESET_CONFIRMATION}" exactly to confirm.`);
      return;
    }

    const confirmed = window.confirm(
      "This permanently removes the selected business records. This cannot be undone.\n\nContinue?"
    );
    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      await resetBusinessDataApi({
        confirmation: confirmation.trim(),
        categories: selectedCategories,
      });

      setSuccess("Business data successfully cleared.");
      setConfirmation("");
      await loadPreview();
      await refreshAll();
    } catch (caught) {
      setError(resolveErrorMessage(caught, "Business data reset failed."));
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Reset Business Data
      </h3>

      <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        <p>This permanently removes all business records.</p>
        <p>This cannot be undone.</p>
        <p>Create a backup first.</p>
      </div>

      {productionMode ? (
        <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Production mode is active. Reset requires{" "}
          <code className="text-amber-100">ALLOW_DESTRUCTIVE_OPS=true</code> on
          the server.
        </p>
      ) : null}

      <p className="mb-4 text-sm text-zinc-400">
        Users, roles, branches, settings, and the owner account are always
        preserved.
      </p>

      <div className="space-y-2">
        {BUSINESS_RESET_CATEGORIES.map((category) => (
          <label
            key={category}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] px-4 py-3 text-sm text-zinc-200"
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selection[category]}
                onChange={() => toggleCategory(category)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
              />
              {BUSINESS_RESET_CATEGORY_LABELS[category]}
            </span>
            <span className="text-xs text-zinc-500">
              {isLoadingPreview
                ? "…"
                : `${preview?.counts[category] ?? 0} records`}
            </span>
          </label>
        ))}
      </div>

      {autoIncludedCategories.length > 0 ? (
        <p className="mt-4 text-xs text-zinc-500">
          Also required for database integrity:{" "}
          {autoIncludedCategories
            .map((category) => BUSINESS_RESET_CATEGORY_LABELS[category])
            .join(", ")}
          .
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <Input
          label={`Type "${BUSINESS_DATA_RESET_CONFIRMATION}" to confirm`}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={BUSINESS_DATA_RESET_CONFIRMATION}
          autoComplete="off"
          spellCheck={false}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            className="border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-500/50 hover:bg-red-500/20"
            onClick={() => void handleReset()}
            loading={isResetting}
            loadingLabel="Resetting..."
            disabled={isResetting || isLoadingPreview}
          >
            Reset Business Data
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadPreview()}
            disabled={isLoadingPreview || isResetting}
          >
            Refresh Counts
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}
    </Card>
  );
}
