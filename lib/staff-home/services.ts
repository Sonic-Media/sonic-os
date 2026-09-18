import type { ReactNode } from "react";

/**
 * Staff Home service action catalog.
 * Swap `iconType` to `"image"` and set `image` to a PNG/SVG path
 * to replace Lucide-style icons with custom artwork without changing the card UI.
 */
export type StaffServiceId =
  | "movies"
  | "accessories"
  | "services"
  | "printing"
  | "windows"
  | "other";

export type StaffServiceIconType = "icon" | "image";

export type StaffServiceAccent =
  | "purple"
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "neutral";

export type StaffServiceAction =
  | { type: "movie-revenue" }
  | { type: "accessory-sale" }
  | { type: "service-sale"; category: Exclude<StaffServiceId, "movies" | "accessories"> }
  | { type: "route"; href: string };

export interface StaffServiceDefinition {
  id: StaffServiceId;
  name: string;
  description: string;
  iconType: StaffServiceIconType;
  /** Built-in icon key when iconType === "icon" */
  icon: StaffServiceId;
  /** Optional custom PNG/SVG under /public when iconType === "image" */
  image?: string;
  accent: StaffServiceAccent;
  action: StaffServiceAction;
  enabled: boolean;
  /** Revenue / activity label */
  revenueLabel: string;
}

export const STAFF_SERVICE_ACCENT_STYLES: Record<
  StaffServiceAccent,
  {
    text: string;
    iconBg: string;
    glow: string;
    borderHover: string;
    ring: string;
  }
> = {
  purple: {
    text: "text-violet-300",
    iconBg: "bg-violet-500/15 ring-violet-500/25",
    glow: "group-hover:shadow-[0_20px_50px_-28px_rgba(139,92,246,0.55)]",
    borderHover: "hover:border-violet-500/35",
    ring: "ring-violet-500/20",
  },
  blue: {
    text: "text-sky-300",
    iconBg: "bg-sky-500/15 ring-sky-500/25",
    glow: "group-hover:shadow-[0_20px_50px_-28px_rgba(56,189,248,0.5)]",
    borderHover: "hover:border-sky-500/35",
    ring: "ring-sky-500/20",
  },
  green: {
    text: "text-emerald-300",
    iconBg: "bg-emerald-500/15 ring-emerald-500/25",
    glow: "group-hover:shadow-[0_20px_50px_-28px_rgba(52,211,153,0.5)]",
    borderHover: "hover:border-emerald-500/35",
    ring: "ring-emerald-500/20",
  },
  red: {
    text: "text-rose-300",
    iconBg: "bg-rose-500/15 ring-rose-500/25",
    glow: "group-hover:shadow-[0_20px_50px_-28px_rgba(244,63,94,0.5)]",
    borderHover: "hover:border-rose-500/35",
    ring: "ring-rose-500/20",
  },
  orange: {
    text: "text-orange-300",
    iconBg: "bg-orange-500/15 ring-orange-500/25",
    glow: "group-hover:shadow-[0_20px_50px_-28px_rgba(251,146,60,0.5)]",
    borderHover: "hover:border-orange-500/35",
    ring: "ring-orange-500/20",
  },
  neutral: {
    text: "text-zinc-300",
    iconBg: "bg-zinc-500/15 ring-zinc-500/25",
    glow: "group-hover:shadow-[0_20px_50px_-28px_rgba(161,161,170,0.4)]",
    borderHover: "hover:border-white/20",
    ring: "ring-white/10",
  },
};

export const STAFF_HOME_SERVICES: StaffServiceDefinition[] = [
  {
    id: "movies",
    name: "Movies",
    description: "Update movie revenue",
    iconType: "icon",
    icon: "movies",
    image: "/assets/services/movies.png",
    accent: "purple",
    action: { type: "movie-revenue" },
    enabled: true,
    revenueLabel: "Movies",
  },
  {
    id: "accessories",
    name: "Phone Accessories",
    description: "Record a sale (cases, chargers, cables, etc.)",
    iconType: "icon",
    icon: "accessories",
    image: "/assets/services/accessories.png",
    accent: "blue",
    action: { type: "accessory-sale" },
    enabled: true,
    revenueLabel: "Phone Accessories",
  },
  {
    id: "services",
    name: "Services",
    description: "Phone unlocking, software, repairs and other services",
    iconType: "icon",
    icon: "services",
    image: "/assets/services/services.png",
    accent: "green",
    action: { type: "service-sale", category: "services" },
    enabled: true,
    revenueLabel: "Services",
  },
  {
    id: "printing",
    name: "Printing & Typing",
    description: "Record printing, typing, scanning, etc.",
    iconType: "icon",
    icon: "printing",
    image: "/assets/services/printing.png",
    accent: "red",
    action: { type: "service-sale", category: "printing" },
    enabled: true,
    revenueLabel: "Printing & Typing",
  },
  {
    id: "windows",
    name: "Windows Installation",
    description: "Record Windows or software installation",
    iconType: "icon",
    icon: "windows",
    image: "/assets/services/windows.png",
    accent: "orange",
    action: { type: "service-sale", category: "windows" },
    enabled: true,
    revenueLabel: "Windows Installation",
  },
  {
    id: "other",
    name: "Other",
    description: "Miscellaneous sale",
    iconType: "icon",
    icon: "other",
    image: "/assets/services/other.png",
    accent: "neutral",
    action: { type: "service-sale", category: "other" },
    enabled: true,
    revenueLabel: "Other",
  },
];

export const SERVICE_SALE_CATEGORIES = [
  "services",
  "printing",
  "windows",
  "other",
] as const;

export type ServiceSaleCategory = (typeof SERVICE_SALE_CATEGORIES)[number];

export function getStaffServiceById(
  id: StaffServiceId
): StaffServiceDefinition | undefined {
  return STAFF_HOME_SERVICES.find((service) => service.id === id);
}

export function getServiceRevenueLabel(id: StaffServiceId): string {
  return getStaffServiceById(id)?.revenueLabel ?? id;
}

/** Resolve which visual to render from config (icon vs custom image). */
export function resolveServiceVisual(service: StaffServiceDefinition): {
  mode: StaffServiceIconType;
  imageSrc?: string;
  iconKey: StaffServiceId;
} {
  if (service.iconType === "image" && service.image) {
    return { mode: "image", imageSrc: service.image, iconKey: service.icon };
  }
  return { mode: "icon", iconKey: service.icon };
}

export type ServiceIconRenderer = (props: {
  className?: string;
}) => ReactNode;
