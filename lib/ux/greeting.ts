import { branchCodesReferToSameInventory } from "@/lib/branch/codes";
import { migrateLegacyAuthRole } from "@/lib/staff/roles";
import { extractFirstName } from "@/lib/ux/user-display";
import type { Branch } from "@/types";
import type { DayClosingRecord } from "@/types/day-closing";
import type { UserRole } from "@/types/auth";

export type GreetingRole = "owner" | "branch-manager" | "cashier";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "late-night";

export interface RotatingGreeting {
  headline: string;
  subtitle: string;
}

const ROLE_SUBTITLES: Record<GreetingRole, readonly string[]> = {
  owner: [
    "Here's what's happening across your business today.",
    "Ready to manage today's operations.",
    "Welcome back.",
  ],
  "branch-manager": [
    "Let's keep the branch running smoothly today.",
    "Ready to support today's operations.",
    "Here's today's branch at a glance.",
  ],
  cashier: [
    "Ready to start today's operations?",
    "Let's have a productive day.",
    "Every sale counts.",
    "Ready when you are.",
    "Wishing you a great shift today.",
  ],
};

const TIME_GREETINGS: Record<TimeOfDay, readonly RotatingGreeting[]> = {
  morning: [
    {
      headline: "Good Morning, {name} 👋",
      subtitle: "Let's have a productive day.",
    },
    {
      headline: "Morning, {name} ☀️",
      subtitle: "Fresh start — let's make it count.",
    },
    {
      headline: "Good Morning, {name} 👋",
      subtitle: "Ready when you are.",
    },
    {
      headline: "Rise and shine, {name} ☀️",
      subtitle: "Let's set the tone for today.",
    },
  ],
  afternoon: [
    {
      headline: "Welcome back, {name} ☀️",
      subtitle: "Hope the day has been treating you well.",
    },
    {
      headline: "Good Afternoon, {name} 👋",
      subtitle: "Let's keep momentum going.",
    },
    {
      headline: "Afternoon, {name} ☀️",
      subtitle: "Steady progress — keep it up.",
    },
    {
      headline: "Welcome back, {name} 👋",
      subtitle: "Let's finish the day strong.",
    },
  ],
  evening: [
    {
      headline: "Good Evening, {name} 🌙",
      subtitle: "Let's finish today's shift strong.",
    },
    {
      headline: "Evening, {name} 👋",
      subtitle: "Time to wrap up today's work.",
    },
    {
      headline: "Good Evening, {name} 🌙",
      subtitle: "Almost there — stay focused.",
    },
    {
      headline: "Evening shift, {name} 🌙",
      subtitle: "Let's close out the day well.",
    },
  ],
  "late-night": [
    {
      headline: "Working late, {name}? 🌙",
      subtitle: "Let's keep today's records accurate.",
    },
    {
      headline: "Late shift, {name}? 🌙",
      subtitle: "Take your time — accuracy matters.",
    },
    {
      headline: "Still at it, {name}? 🌙",
      subtitle: "Let's get everything recorded properly.",
    },
    {
      headline: "Working late, {name}? 🌙",
      subtitle: "Thanks for keeping things on track.",
    },
  ],
};

const WEEKDAY_GREETINGS: Record<number, readonly RotatingGreeting[]> = {
  0: [
    {
      headline: "Easy Sunday, {name} 👋",
      subtitle: "Let's keep things smooth today.",
    },
  ],
  1: [
    {
      headline: "Happy Monday, {name} 👋",
      subtitle: "New week — clean slate.",
    },
    {
      headline: "Monday morning, {name} ☀️",
      subtitle: "Let's start the week strong.",
    },
  ],
  5: [
    {
      headline: "Happy Friday, {name} 🙌",
      subtitle: "Finish the week on a high note.",
    },
    {
      headline: "Friday, {name} 👋",
      subtitle: "Almost there — keep it up.",
    },
  ],
  6: [
    {
      headline: "Saturday shift, {name} 👋",
      subtitle: "Let's make today count.",
    },
  ],
};

const FIRST_OF_MONTH_GREETINGS: readonly RotatingGreeting[] = [
  {
    headline: "New month, {name} 👋",
    subtitle: "Let's start on the right foot.",
  },
  {
    headline: "Welcome to a new month, {name} ✨",
    subtitle: "Fresh numbers, fresh goals.",
  },
  {
    headline: "First shift of the month, {name} 👋",
    subtitle: "Let's set the pace early.",
  },
];

const RETURNING_GREETINGS: readonly RotatingGreeting[] = [
  {
    headline: "Welcome back, {name} 👋",
    subtitle: "Good to see you again.",
  },
  {
    headline: "Hey {name}, missed you 👋",
    subtitle: "Let's ease back into the rhythm.",
  },
  {
    headline: "Welcome back, {name} ☀️",
    subtitle: "Ready to pick up where we left off?",
  },
  {
    headline: "Good to have you back, {name} 👋",
    subtitle: "Let's get today moving.",
  },
];

const START_SHIFT_SUCCESS_LINES: readonly string[] = [
  "Have a great day, {name}.",
  "Let's make today count, {name}.",
  "You're all set, {name}.",
  "Have a productive shift, {name}.",
];

const CLOSE_DAY_FAREWELLS: readonly string[] = [
  "See you tomorrow, {name} 👋",
  "Rest well, {name} — see you next shift 👋",
  "Great shift, {name}. See you tomorrow 👋",
  "Take it easy tonight, {name} 👋",
];

const CLOSE_DAY_HEADLINES: readonly string[] = [
  "Great work today!",
  "Another day done well!",
  "Solid work today!",
];

const SHIFT_COMPLETED_LINES: readonly RotatingGreeting[] = [
  {
    headline: "Shift complete, {name} ✓",
    subtitle: "See you tomorrow 👋",
  },
  {
    headline: "All done for today, {name}",
    subtitle: "Rest up — see you next shift 👋",
  },
  {
    headline: "Today's shift is wrapped up, {name}",
    subtitle: "See you tomorrow 👋",
  },
];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickFromPool<T>(pool: readonly T[], seed: string): T {
  return pool[hashSeed(seed) % pool.length];
}

function formatGreeting(template: RotatingGreeting, firstName: string): RotatingGreeting {
  return {
    headline: template.headline.replaceAll("{name}", firstName),
    subtitle: template.subtitle.replaceAll("{name}", firstName),
  };
}

function formatLine(template: string, firstName: string): string {
  return template.replaceAll("{name}", firstName);
}

export function mapAuthRoleToGreetingRole(role: UserRole): GreetingRole {
  if (role === "owner") return "owner";

  const staffRole = migrateLegacyAuthRole(role);
  return staffRole === "branch-manager" ? "branch-manager" : "cashier";
}

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();

  if (hour >= 22 || hour < 5) {
    return "late-night";
  }

  if (hour < 12) {
    return "morning";
  }

  if (hour < 17) {
    return "afternoon";
  }

  return "evening";
}

export function getDaysSinceLastShift(
  closings: DayClosingRecord[],
  branch: Branch,
  today: string
): number | null {
  const priorDates = closings
    .filter(
      (record) =>
        branchCodesReferToSameInventory(record.branch, branch) &&
        record.date < today &&
        (record.status === "closed" || record.openedAt || record.reopenedAt)
    )
    .map((record) => record.date)
    .sort((a, b) => b.localeCompare(a));

  if (priorDates.length === 0) {
    return null;
  }

  const lastDate = priorDates[0];
  const lastMs = new Date(`${lastDate}T12:00:00`).getTime();
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  const diffDays = Math.round((todayMs - lastMs) / (24 * 60 * 60 * 1000));

  return diffDays > 0 ? diffDays : null;
}

export function getPersonalizedGreetingLine(
  name: string,
  date = new Date()
): string {
  const firstName = extractFirstName(name);
  const hour = date.getHours();
  let timeGreeting = "Good Evening";

  if (hour >= 22 || hour < 5) {
    timeGreeting = "Good Evening";
  } else if (hour < 12) {
    timeGreeting = "Good Morning";
  } else if (hour < 17) {
    timeGreeting = "Good Afternoon";
  }

  return `${timeGreeting}, ${firstName}`;
}

export function getRandomRoleSubtitle(role: GreetingRole): string {
  const options = ROLE_SUBTITLES[role];
  return options[Math.floor(Math.random() * options.length)] ?? options[0];
}

export interface ShiftGreetingOptions {
  displayName: string;
  date?: Date;
  dateKey?: string;
  daysSinceLastShift?: number | null;
  context?: string;
}

export function getRotatingShiftGreeting(
  options: ShiftGreetingOptions
): RotatingGreeting {
  const date = options.date ?? new Date();
  const firstName = extractFirstName(options.displayName);
  const dateKey = options.dateKey ?? date.toISOString().slice(0, 10);
  const daysSinceLastShift = options.daysSinceLastShift;
  const context = options.context ?? "start-shift";

  let pool: readonly RotatingGreeting[];
  let scenario: string;

  if (typeof daysSinceLastShift === "number" && daysSinceLastShift >= 2) {
    pool = RETURNING_GREETINGS;
    scenario = "returning";
  } else if (date.getDate() === 1) {
    pool = FIRST_OF_MONTH_GREETINGS;
    scenario = "first-of-month";
  } else {
    const timeOfDay = getTimeOfDay(date);
    pool = TIME_GREETINGS[timeOfDay];
    scenario = timeOfDay;
  }

  const weekdayExtras = WEEKDAY_GREETINGS[date.getDay()] ?? [];
  const combinedPool =
    weekdayExtras.length > 0 ? [...pool, ...weekdayExtras] : pool;
  const seed = `${dateKey}-${context}-${scenario}-${firstName}`;
  const picked = pickFromPool(combinedPool, seed);

  return formatGreeting(picked, firstName);
}

export function getStartShiftSuccessLine(
  displayName: string,
  dateKey: string
): string {
  const firstName = extractFirstName(displayName);
  const picked = pickFromPool(
    START_SHIFT_SUCCESS_LINES,
    `${dateKey}-start-success-${firstName}`
  );
  return formatLine(picked, firstName);
}

export function getCloseDayFarewell(
  displayName: string,
  dateKey: string
): string {
  const firstName = extractFirstName(displayName);
  const picked = pickFromPool(
    CLOSE_DAY_FAREWELLS,
    `${dateKey}-close-farewell-${firstName}`
  );
  return formatLine(picked, firstName);
}

export function getCloseDayHeadline(dateKey: string): string {
  return pickFromPool(CLOSE_DAY_HEADLINES, `${dateKey}-close-headline`);
}

export function getShiftCompletedGreeting(
  displayName: string,
  dateKey: string
): RotatingGreeting {
  const firstName = extractFirstName(displayName);
  const picked = pickFromPool(
    SHIFT_COMPLETED_LINES,
    `${dateKey}-shift-completed-${firstName}`
  );
  return formatGreeting(picked, firstName);
}

export function formatGreetingTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
