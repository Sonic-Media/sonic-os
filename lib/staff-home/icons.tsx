import type { StaffServiceId } from "@/lib/staff-home/services";
import { cn } from "@/lib/utils";

const iconClass = "h-7 w-7";

export function StaffServiceIcon({
  name,
  className,
}: {
  name: StaffServiceId;
  className?: string;
}) {
  const cls = cn(iconClass, className);

  switch (name) {
    case "movies":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 5l1.5 2.5M11 5l1.5 2.5M15 5l1.5 2.5M7 19l1.5-2.5M11 19l1.5-2.5M15 19l1.5-2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "accessories":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="8"
            y="2.5"
            width="8"
            height="19"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M10 5.5h4M11 18.5h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "services":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14.7 6.3a4.2 4.2 0 01-5.4 5.4L4.5 16.5l3 3 4.8-4.8a4.2 4.2 0 015.4-5.4l-2.1 2.1-1.9-.9-.9-1.9 2.1-2.1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "printing":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 8V4.5A1.5 1.5 0 018.5 3h7A1.5 1.5 0 0117 4.5V8"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="4"
            y="8"
            width="16"
            height="8"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 13h10v7.5A1.5 1.5 0 0115.5 22h-7A1.5 1.5 0 017 20.5V13z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="17" cy="11" r="0.9" fill="currentColor" />
        </svg>
      );
    case "windows":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 5.5l8.2-1.2v7.1H3V5.5zm9.3-1.35L21 3v8.4h-8.7V4.15zM3 12.6h8.2v7.1L3 18.5v-5.9zm9.3 0H21V21l-8.7-1.25V12.6z" />
        </svg>
      );
    case "other":
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="6" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="18" cy="12" r="1.6" />
        </svg>
      );
  }
}
