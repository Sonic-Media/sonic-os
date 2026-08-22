import { migrateLegacyAuthRole } from "@/lib/staff/roles";
import type { UserRole } from "@/types/auth";

export type GreetingRole = "owner" | "branch-manager" | "cashier";

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

export function mapAuthRoleToGreetingRole(role: UserRole): GreetingRole {
  if (role === "owner") return "owner";

  const staffRole = migrateLegacyAuthRole(role);
  return staffRole === "branch-manager" ? "branch-manager" : "cashier";
}

export function getPersonalizedGreetingLine(
  name: string,
  date = new Date()
): string {
  const hour = date.getHours();
  let timeGreeting = "Good Evening";

  if (hour < 12) {
    timeGreeting = "Good Morning";
  } else if (hour < 17) {
    timeGreeting = "Good Afternoon";
  }

  return `${timeGreeting}, ${name}`;
}

export function getRandomRoleSubtitle(role: GreetingRole): string {
  const options = ROLE_SUBTITLES[role];
  return options[Math.floor(Math.random() * options.length)] ?? options[0];
}
