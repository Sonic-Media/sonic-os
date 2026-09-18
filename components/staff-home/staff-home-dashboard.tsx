"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ActivityFeed } from "@/components/staff-home/activity-feed";
import { BrandCard } from "@/components/staff-home/brand-card";
import { MovieRevenueDialog } from "@/components/staff-home/movie-revenue-dialog";
import { QuickActions } from "@/components/staff-home/quick-actions";
import { RevenueSummary } from "@/components/staff-home/revenue-summary";
import { ServiceActionCard } from "@/components/staff-home/service-action-card";
import { ServiceSaleDialog } from "@/components/staff-home/service-sale-dialog";
import {
  ShopStatusCard,
  type ShopStatusState,
} from "@/components/staff-home/shop-status-card";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { StockDialog } from "@/components/stock/stock-dialog";
import { useAuth } from "@/context/auth-context";
import { useDayClosing } from "@/context/day-closing-context";
import { useSales } from "@/context/sales-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { useToast } from "@/context/toast-context";
import { canOpenShop } from "@/lib/day-closing/permissions";
import { getTodayISO } from "@/lib/dates";
import { getGreeting } from "@/lib/format";
import { roleHasModuleAccess } from "@/lib/staff/permissions";
import { buildStaffHomeActivity } from "@/lib/staff-home/activity";
import { computeStaffHomeRevenue } from "@/lib/staff-home/revenue";
import {
  appendServiceSaleToNotes,
  createServiceSaleRecord,
} from "@/lib/staff-home/service-sales";
import {
  STAFF_HOME_SERVICES,
  type ServiceSaleCategory,
  type StaffServiceDefinition,
} from "@/lib/staff-home/services";
import { toStaffFacingError } from "@/lib/ux/staff-messages";
import { resolveStaffDisplayName } from "@/lib/ux/user-display";
import { isPayrollEntryExpense } from "@/lib/expenses";
import type { SubmitRequestResult } from "@/hooks/use-entry-form";
import type { Branch, EntryFormData } from "@/types";
import type { DayClosingRecord, DayClosingStatus } from "@/types/day-closing";

function formatStaffHomeDate(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface StaffHomeDashboardProps {
  branch: Branch;
  form: EntryFormData;
  movieRevenue: number;
  movieTime?: string;
  movieSortKey?: number;
  shopOpen: boolean;
  dayClosed: boolean;
  closeRequestPending: boolean;
  activeBusinessDayStatus?: DayClosingStatus;
  openRecord?: DayClosingRecord | null;
  isSaving: boolean;
  isClosing: boolean;
  closeError?: string | null;
  onSaveMovieRevenue: (amount: string) => Promise<SubmitRequestResult>;
  onPersistNotes: (notes: string) => Promise<SubmitRequestResult>;
  onCloseShop: () => void;
  onAddExpense: () => void;
  onOpenShopComplete?: () => void | Promise<void>;
}

export function StaffHomeDashboard({
  branch,
  form,
  movieRevenue,
  movieTime,
  movieSortKey,
  shopOpen,
  dayClosed,
  closeRequestPending,
  activeBusinessDayStatus,
  openRecord,
  isSaving,
  isClosing,
  closeError,
  onSaveMovieRevenue,
  onPersistNotes,
  onCloseShop,
  onAddExpense,
  onOpenShopComplete,
}: StaffHomeDashboardProps) {
  const router = useRouter();
  const today = getTodayISO();
  const { session } = useAuth();
  const { staff } = useStaff();
  const { sales } = useSales();
  const { settings } = useSettings();
  const { openDay, refreshClosings } = useDayClosing();
  const { success: toastSuccess } = useToast();

  const [movieDialogOpen, setMovieDialogOpen] = useState(false);
  const [accessoryDialogOpen, setAccessoryDialogOpen] = useState(false);
  const [serviceCategory, setServiceCategory] =
    useState<ServiceSaleCategory | null>(null);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [isOpeningShop, setIsOpeningShop] = useState(false);
  const [openShopError, setOpenShopError] = useState<string | null>(null);
  const [saleRefreshKey, setSaleRefreshKey] = useState(0);

  const staffName = useMemo(
    () => resolveStaffDisplayName(session, staff),
    [session, staff]
  );
  const firstName = staffName.split(" ")[0] ?? staffName;

  const shopState: ShopStatusState = dayClosed
    ? "closed"
    : closeRequestPending || activeBusinessDayStatus === "close_requested"
      ? "close_requested"
      : shopOpen || activeBusinessDayStatus === "open"
        ? "open"
        : "closed";

  const actionsEnabled =
    shopState === "open" && !dayClosed && !closeRequestPending;

  const revenue = useMemo(
    () =>
      computeStaffHomeRevenue({
        branch,
        date: form.date,
        movieRevenue,
        sales,
        entryNotes: form.notes,
      }),
    [branch, form.date, form.notes, movieRevenue, sales]
  );

  const activity = useMemo(() => {
    const expenseItems = form.expenses
      .filter((expense) => expense.amount > 0 && !isPayrollEntryExpense(expense))
      .map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        name: expense.name,
      }));

    return buildStaffHomeActivity({
      branch,
      date: form.date,
      sales,
      movieRevenue,
      movieTime,
      movieSortKey,
      entryNotes: form.notes,
      openRecord,
      expenseItems,
      limit: 8,
    });
  }, [
    branch,
    form.date,
    form.expenses,
    form.notes,
    movieRevenue,
    movieSortKey,
    movieTime,
    openRecord,
    sales,
  ]);

  const handleServiceClick = useCallback(
    (service: StaffServiceDefinition) => {
      if (!actionsEnabled) return;

      switch (service.action.type) {
        case "movie-revenue":
          setMovieDialogOpen(true);
          break;
        case "accessory-sale":
          setAccessoryDialogOpen(true);
          break;
        case "service-sale":
          setServiceCategory(service.action.category);
          break;
        case "route":
          router.push(service.action.href);
          break;
      }
    },
    [actionsEnabled, router]
  );

  const handleOpenShop = useCallback(async () => {
    if (!session || isOpeningShop) return;
    setIsOpeningShop(true);
    setOpenShopError(null);

    try {
      const result = await openDay(branch, today);
      if (!result.success) {
        setOpenShopError(
          toStaffFacingError(result.errors.form ?? "", {
            ownerName: settings.ownerName,
            context: "start-shift",
          })
        );
        return;
      }

      toastSuccess("Shop Opened");
      try {
        await refreshClosings();
      } catch {
        // Shop is already open; refresh is best-effort.
      }
      if (onOpenShopComplete) {
        await onOpenShopComplete();
      }
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not open the shop.";
      setOpenShopError(
        toStaffFacingError(message, {
          ownerName: settings.ownerName,
          context: "start-shift",
        })
      );
    } finally {
      setIsOpeningShop(false);
    }
  }, [
    branch,
    isOpeningShop,
    onOpenShopComplete,
    openDay,
    refreshClosings,
    router,
    session,
    settings.ownerName,
    today,
    toastSuccess,
  ]);

  const handleSaveServiceSale = useCallback(
    async (input: {
      category: ServiceSaleCategory;
      amount: number;
      description?: string;
    }) => {
      setServiceSaving(true);
      try {
        const sale = createServiceSaleRecord({
          category: input.category,
          amount: input.amount,
          description: input.description,
          staffId: session?.staffId,
          staffName: staffName,
        });
        const nextNotes = appendServiceSaleToNotes(form.notes, sale);
        const result = await onPersistNotes(nextNotes);
        if (!result.success) {
          return {
            success: false,
            error: result.error ?? "Could not save service sale.",
          };
        }
        toastSuccess("Sale recorded");
        return { success: true };
      } finally {
        setServiceSaving(false);
      }
    },
    [form.notes, onPersistNotes, session?.staffId, staffName, toastSuccess]
  );

  const handleMovieSave = useCallback(
    async (amount: string) => {
      const result = await onSaveMovieRevenue(amount);
      if (result.success) {
        toastSuccess("Movie revenue updated.");
      }
      return result;
    },
    [onSaveMovieRevenue, toastSuccess]
  );

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start">
        <div className="space-y-6 min-w-0">
          <header className="space-y-2">
            <p className="text-sm text-zinc-500">{formatStaffHomeDate()}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]">
              {getGreeting(firstName)} 👋
            </h1>
            <p className="text-sm text-zinc-400">Let&apos;s get things done.</p>
          </header>

          <div className="xl:hidden">
            <ShopStatusCard
              state={shopState}
              openedAt={openRecord?.openedAt ?? openRecord?.reopenedAt}
              openedByName={openRecord?.openedByName}
              onOpenShop={() => void handleOpenShop()}
              onCloseShop={onCloseShop}
              isOpening={isOpeningShop}
              isClosing={isClosing}
              canOpen={Boolean(session && canOpenShop(session.role))}
              canClose={shopState === "open"}
              error={openShopError ?? closeError}
            />
          </div>

          <section className="space-y-4">
            <p className="text-lg font-medium text-zinc-200">
              What would you like to do?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {STAFF_HOME_SERVICES.map((service) => (
                <ServiceActionCard
                  key={service.id}
                  service={service}
                  disabled={!actionsEnabled}
                  onClick={() => handleServiceClick(service)}
                />
              ))}
            </div>
            {!actionsEnabled ? (
              <p className="text-sm text-zinc-500">
                {shopState === "closed"
                  ? "Open the shop to start recording today's work."
                  : shopState === "close_requested"
                    ? "Closing has been requested. Recording is paused until review."
                    : "Recording is unavailable right now."}
              </p>
            ) : null}
          </section>

          <div className="space-y-4 xl:hidden">
            <RevenueSummary revenue={revenue} />
            <ActivityFeed items={activity} viewAllHref="/sales" />
          </div>

          <QuickActions
            onAddExpense={onAddExpense}
            showStock={Boolean(
              session && roleHasModuleAccess(session.role, "stock")
            )}
          />
          <BrandCard />
        </div>

        <aside className="hidden space-y-4 xl:block">
          <ShopStatusCard
            state={shopState}
            openedAt={openRecord?.openedAt ?? openRecord?.reopenedAt}
            openedByName={openRecord?.openedByName}
            onOpenShop={() => void handleOpenShop()}
            onCloseShop={onCloseShop}
            isOpening={isOpeningShop}
            isClosing={isClosing}
            canOpen={Boolean(session && canOpenShop(session.role))}
            canClose={shopState === "open"}
            error={openShopError ?? closeError}
          />
          <RevenueSummary revenue={revenue} />
          <ActivityFeed items={activity} viewAllHref="/sales" />
        </aside>
      </div>

      <MovieRevenueDialog
        open={movieDialogOpen}
        currentAmount={form.sales}
        isSaving={isSaving}
        onClose={() => setMovieDialogOpen(false)}
        onSave={handleMovieSave}
      />

      <ServiceSaleDialog
        open={serviceCategory !== null}
        category={serviceCategory}
        isSaving={serviceSaving || isSaving}
        onClose={() => setServiceCategory(null)}
        onSave={handleSaveServiceSale}
      />

      {accessoryDialogOpen ? (
        <StockDialog
          title="Phone Accessories"
          description="Record a sale (cases, chargers, cables, etc.)"
          onClose={() => setAccessoryDialogOpen(false)}
        >
          <NewSaleForm
            key={saleRefreshKey}
            inline
            onSuccess={() => {
              setSaleRefreshKey((value) => value + 1);
              toastSuccess("Sale Recorded");
              setAccessoryDialogOpen(false);
            }}
          />
        </StockDialog>
      ) : null}
    </>
  );
}
