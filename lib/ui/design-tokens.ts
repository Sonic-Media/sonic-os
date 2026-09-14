/**
 * Sonic OS V2 design tokens — single source of truth for UI consistency.
 * Premium dark operating-system aesthetic with semantic accent colors.
 */

export type SonicAccent = "green" | "blue" | "purple" | "orange" | "red" | "neutral";

export const uiAccent = {
  green: "text-emerald-400",
  blue: "text-blue-400",
  purple: "text-violet-400",
  orange: "text-orange-400",
  red: "text-red-400",
  neutral: "text-zinc-400",
} as const;

export const uiAccentBg = {
  green: "bg-emerald-500/10 ring-emerald-500/20",
  blue: "bg-blue-500/10 ring-blue-500/20",
  purple: "bg-violet-500/10 ring-violet-500/20",
  orange: "bg-orange-500/10 ring-orange-500/20",
  red: "bg-red-500/10 ring-red-500/20",
  neutral: "bg-zinc-800/60 ring-white/[0.06]",
} as const;

export const uiAccentBorder = {
  green: "border-emerald-500/20",
  blue: "border-blue-500/20",
  purple: "border-violet-500/20",
  orange: "border-orange-500/20",
  red: "border-red-500/20",
  neutral: "border-white/[0.08]",
} as const;

export const uiRadius = {
  sm: "rounded-xl",
  md: "rounded-2xl",
  lg: "rounded-[18px]",
  full: "rounded-full",
} as const;

export const uiSpacing = {
  section: "space-y-6",
  stack: "space-y-4",
  tight: "space-y-2",
  cardPadding: "p-5 sm:p-6",
  cardPaddingLg: "p-6 sm:p-7",
  page: "space-y-6 pb-10",
} as const;

export const uiTypography = {
  sectionLabel:
    "text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500",
  sectionTitle: "text-xl font-semibold tracking-tight text-white",
  pageTitle: "text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]",
  body: "text-sm leading-relaxed text-zinc-400",
  bodyMuted: "text-sm text-zinc-500",
  money: "font-bold tabular-nums tracking-tight text-white",
  label: "block text-sm font-medium text-zinc-400",
} as const;

export const uiSurface = {
  card:
    "rounded-[14px] border border-white/[0.08] bg-[rgba(12,14,26,0.72)] shadow-lg shadow-black/30 backdrop-blur-sm",
  cardElevated:
    "rounded-[14px] border border-white/[0.1] bg-[rgba(16,18,32,0.85)] shadow-xl shadow-black/40 backdrop-blur-md",
  cardSubtle:
    "rounded-[14px] border border-white/[0.06] bg-[rgba(8,10,20,0.55)] backdrop-blur-md",
  cardInset: "rounded-[14px] border border-white/[0.05] bg-black/25",
  sidebar:
    "border-r border-white/[0.06] bg-[rgba(8,10,18,0.95)] backdrop-blur-xl",
  input:
    "h-12 w-full rounded-xl border border-white/[0.08] bg-[rgba(12,14,26,0.8)] px-4 text-base text-white placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
  modal:
    "rounded-2xl border border-white/[0.08] bg-[rgba(8,10,18,0.98)] shadow-2xl shadow-black/50",
} as const;

export const uiInteraction = {
  button:
    "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  buttonHover:
    "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.8)]",
  cardHover:
    "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/[0.12]",
} as const;

export const uiMotion = {
  accordion: "duration-200 ease-out",
  fadeIn: "animate-in fade-in duration-200",
} as const;
