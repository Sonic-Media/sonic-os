"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { Input } from "@/components/shared/ui/input";
import { isApiError } from "@/lib/api/errors";
import {
  previewShopResetApi,
  resetShopApi,
  type ShopResetPreviewResponse,
  type ShopResetReportResponse,
} from "@/lib/api/shop-reset";
import {
  getShopResetConfirmationPhrase,
  SHOP_RESET_CONFIRM_BOTH,
  SHOP_RESET_SCOPE_OPTIONS,
  type ShopResetScope,
} from "@/lib/shop-reset/constants";
import { useAppDataRefresh } from "@/hooks/use-app-data-refresh";
import { cn } from "@/lib/utils";

type ResetPhase =
  | "idle"
  | "backing_up"
  | "resetting"
  | "verifying"
  | "complete"
  | "error";

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          highlight === "success" ? "text-emerald-400" : "text-white"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function ShopResetSection() {
  const { refreshAll } = useAppDataRefresh();
  const [scope, setScope] = useState<ShopResetScope>("main");
  const [preview, setPreview] = useState<ShopResetPreviewResponse | null>(null);
  const [report, setReport] = useState<ShopResetReportResponse | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [phase, setPhase] = useState<ResetPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  const confirmationPhrase = useMemo(() => {
    if (scope === "both") {
      return SHOP_RESET_CONFIRM_BOTH;
    }
    return getShopResetConfirmationPhrase(scope);
  }, [scope]);

  const selectedLabel = useMemo(() => {
    if (scope === "both") {
      return "Both Shops";
    }
    return (
      SHOP_RESET_SCOPE_OPTIONS.find((option) => option.scope === scope)?.label ??
      "Shop"
    );
  }, [scope]);

  const resetButtonLabel = useMemo(() => {
    if (scope === "both") {
      return "Reset Both Sonic Shops";
    }
    return `Reset ${selectedLabel} Shop`;
  }, [scope, selectedLabel]);

  const confirmationMatches = confirmation.trim() === confirmationPhrase;
  const canSubmit =
    confirmationMatches &&
    preview?.canReset &&
    phase !== "backing_up" &&
    phase !== "resetting" &&
    phase !== "verifying";

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const nextPreview = await previewShopResetApi(scope);
      setPreview(nextPreview);
    } catch (caught) {
      setError(resolveErrorMessage(caught, "Could not load shop reset preview."));
    } finally {
      setIsLoadingPreview(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    setConfirmation("");
    setReport(null);
    setPhase("idle");
  }, [scope]);

  async function handleReset() {
    if (!confirmationMatches || !preview?.canReset) {
      return;
    }

    setPhase("backing_up");
    setError(null);
    setReport(null);

    try {
      setPhase("resetting");
      const result = await resetShopApi({
        scope,
        confirmation: confirmation.trim(),
      });
      setPhase("verifying");
      setReport(result);
      setPhase("complete");
      await loadPreview();
      await refreshAll();
    } catch (caught) {
      setPhase("error");
      setError(resolveErrorMessage(caught, "Shop reset failed."));
    }
  }

  const phaseMessage =
    phase === "backing_up"
      ? "Backing up..."
      : phase === "resetting"
        ? "Resetting shop..."
        : phase === "verifying"
          ? "Verifying..."
          : phase === "complete"
            ? "Complete"
            : null;

  return (
    <Card className="shadow-[0_24px_80px_-48px_rgba(99,102,241,0.25)]">
      <h3 className="mb-1 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Reset Shop
      </h3>
      <p className="mb-5 text-sm text-zinc-400">
        Return a shop to a clean operational state.
      </p>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="shop-reset-scope"
            className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Select Shop
          </label>
          <select
            id="shop-reset-scope"
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as ShopResetScope)
            }
            disabled={phase === "resetting" || phase === "backing_up"}
            className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white outline-none ring-indigo-500/30 focus:border-indigo-500/40 focus:ring-2"
          >
            {SHOP_RESET_SCOPE_OPTIONS.map((option) => (
              <option key={option.scope} value={option.scope}>
                {option.label}
              </option>
            ))}
            <option value="both">Both Shops</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-300">
              Will Be Cleared
            </p>
            <ul className="mt-3 space-y-2 text-sm text-red-100/90">
              {[
                ["Sales", preview?.counts.sales],
                ["Expenses", preview?.counts.expenses],
                ["Purchases", preview?.counts.purchases],
                ["Staff Payments", preview?.counts.staffPayments],
                ["Daily Operations", preview?.counts.dailyOperations],
                ["Closing Records", preview?.counts.dayClosings],
                ["Stock Movements", preview?.counts.stockMovements],
                ["Customers / Suppliers", (preview?.counts.customers ?? 0) + (preview?.counts.suppliers ?? 0)],
                ["Current Stock", preview?.counts.productStockReset],
              ].map(([label, count]) => (
                <li key={String(label)} className="flex justify-between gap-3">
                  <span>{label}</span>
                  <span className="tabular-nums text-red-200/80">
                    {isLoadingPreview ? "…" : count ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Will Be Preserved
            </p>
            <ul className="mt-3 space-y-2 text-sm text-emerald-100/90">
              {[
                ["Users", preview?.preserved.users],
                ["Staff", preview?.preserved.staff],
                ["Roles", preview?.preserved.roles],
                ["Branches", preview?.preserved.branches],
                ["Product Catalogue", preview?.preserved.products],
                ["Categories", preview?.preserved.productCategories],
                ["Settings", preview?.preserved.settings],
              ].map(([label, count]) => (
                <li key={String(label)} className="flex justify-between gap-3">
                  <span>{label}</span>
                  <span className="tabular-nums text-emerald-200/80">
                    {isLoadingPreview ? "…" : count ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {preview?.blockers.length ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {preview.blockers.map((blocker) => (
              <p key={blocker}>{blocker}</p>
            ))}
          </div>
        ) : null}

        <Input
          label={`Type "${confirmationPhrase}" to confirm`}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={confirmationPhrase}
          autoComplete="off"
          spellCheck={false}
          disabled={phase === "resetting" || phase === "backing_up"}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            className="border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-500/50 hover:bg-red-500/20"
            onClick={() => void handleReset()}
            loading={phase === "backing_up" || phase === "resetting" || phase === "verifying"}
            loadingLabel={phaseMessage ?? "Resetting..."}
            disabled={!canSubmit}
          >
            {resetButtonLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadPreview()}
            disabled={isLoadingPreview || phase === "resetting"}
          >
            Refresh Counts
          </Button>
        </div>

        {phaseMessage ? (
          <p className="text-sm text-indigo-300">{phaseMessage}</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {report && phase === "complete" ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-200">
              Verification
            </p>
            <div className="mt-3 space-y-2">
              <SummaryRow label="Sales" value={report.verification.sales} highlight="success" />
              <SummaryRow label="Expenses" value={report.verification.expenses} highlight="success" />
              <SummaryRow label="Purchases" value={report.verification.purchases} highlight="success" />
              <SummaryRow label="Staff Payments" value={report.verification.staffPayments} highlight="success" />
              <SummaryRow label="Day Closings" value={report.verification.dayClosings} highlight="success" />
              <SummaryRow label="Stock Movements" value={report.verification.stockMovements} highlight="success" />
              <SummaryRow
                label="Current Stock (products reset)"
                value={report.verification.productStockReset}
                highlight="success"
              />
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Backup saved before reset.
            </p>
            <div className="mt-4">
              <Button href="/operations/today" variant="secondary">
                Start Fresh → Open Shop
              </Button>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-zinc-500">
          Owner-only. A database backup is created automatically before any shop
          reset proceeds. Operational audit entries for the selected shop are
          cleared; authentication audit history is preserved.
        </p>
      </div>
    </Card>
  );
}
