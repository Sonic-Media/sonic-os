/**
 * Sonic OS V1 design tokens — single source of truth for UI consistency.
 */

export const uiRadius = {
  sm: "rounded-xl",
  md: "rounded-2xl",
  lg: "rounded-3xl",
  full: "rounded-full",
} as const;

export const uiSpacing = {
  section: "space-y-6",
  stack: "space-y-4",
  tight: "space-y-2",
  cardPadding: "p-6",
  cardPaddingLg: "p-6 sm:p-7",
  page: "space-y-6 pb-10",
} as const;

export const uiTypography = {
  sectionLabel:
    "text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500",
  sectionTitle: "text-xl font-semibold tracking-tight text-white",
  pageTitle: "text-2xl font-semibold tracking-tight text-white sm:text-3xl",
  body: "text-sm leading-relaxed text-zinc-400",
  bodyMuted: "text-sm text-zinc-500",
  money: "font-bold tabular-nums tracking-tight text-white",
  label: "block text-sm font-medium text-zinc-400",
} as const;

export const uiSurface = {
  card:
    "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20",
  cardElevated:
    "rounded-2xl border border-zinc-700/50 bg-zinc-900/80 shadow-xl shadow-black/30",
  cardSubtle:
    "rounded-2xl border border-white/[0.06] bg-zinc-950/55 backdrop-blur-md",
  cardInset: "rounded-2xl border border-white/[0.05] bg-black/20",
  input:
    "h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 text-base text-white placeholder:text-zinc-600 transition-all duration-200 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20",
  modal:
    "rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-2xl",
} as const;

export const uiInteraction = {
  button:
    "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  buttonHover:
    "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.8)]",
  cardHover:
    "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/[0.09]",
} as const;

export const uiMotion = {
  accordion: "duration-200 ease-out",
  fadeIn: "animate-in fade-in duration-200",
} as const;
