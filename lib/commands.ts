import { BRANCH_IDS } from "@/lib/constants";
import { getTodayISO } from "@/lib/dates";
import { findMostRecentEntryForDate } from "@/lib/entry-helpers";
import { getCategoryLabel } from "@/lib/expense-template-storage";
import type { Branch, Entry, ExpenseTemplate, Staff } from "@/types";

export type CommandGroup =
  | "quick-actions"
  | "pages"
  | "staff"
  | "branches"
  | "expense-templates";

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
  "quick-actions": "Quick Actions",
  pages: "Pages",
  staff: "Staff",
  branches: "Branches",
  "expense-templates": "Expense Templates",
};

export const COMMAND_GROUP_ORDER: CommandGroup[] = [
  "quick-actions",
  "pages",
  "staff",
  "branches",
  "expense-templates",
];

export interface CommandContext {
  draftEntry?: Entry;
  staff: Staff[];
  branchNames: Record<Branch, string>;
  templates: ExpenseTemplate[];
}

export interface ResolvedCommand {
  id: string;
  label: string;
  detail?: string;
  group: CommandGroup;
  href: string;
  keywords: string[];
}

interface CommandDefinition {
  id: string;
  label: string;
  detail?: string;
  group: CommandGroup;
  keywords?: string[];
  href: string | ((context: CommandContext) => string | null);
  isAvailable?: (context: CommandContext) => boolean;
}

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "todays-operations",
    label: "Today's Operations",
    group: "quick-actions",
    keywords: ["today", "operations", "entry", "daily", "close day"],
    href: "/operations/today",
  },
  {
    id: "historical-operations",
    label: "Historical Operations",
    group: "quick-actions",
    keywords: ["historical", "operations", "past", "record", "history entry"],
    href: "/operations/historical",
  },
  {
    id: "new-staff",
    label: "New Staff",
    detail: "Add a team member in Settings",
    group: "quick-actions",
    keywords: ["new", "staff", "team", "employee", "hire", "add"],
    href: "/settings",
  },
  {
    id: "new-expense-template",
    label: "New Expense Template",
    detail: "Create a template in Settings",
    group: "quick-actions",
    keywords: ["new", "expense", "template", "add", "create"],
    href: "/settings",
  },
  {
    id: "open-reports",
    label: "Open Reports",
    group: "quick-actions",
    keywords: ["open", "reports", "report", "charts"],
    href: "/reports",
  },
  {
    id: "open-dashboard",
    label: "Open Dashboard",
    group: "quick-actions",
    keywords: ["open", "dashboard", "home", "analytics"],
    href: "/",
  },
  {
    id: "open-settings",
    label: "Open Settings",
    group: "quick-actions",
    keywords: ["open", "settings", "preferences", "config"],
    href: "/settings",
  },
  {
    id: "continue-entry",
    label: "Continue Today's Entry",
    detail: "Resume your draft for today",
    group: "quick-actions",
    keywords: ["continue", "draft", "today", "entry", "resume"],
    href: (context) =>
      context.draftEntry
        ? `/operations/today?branch=${context.draftEntry.branch}`
        : null,
    isAvailable: (context) => !!context.draftEntry,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    group: "pages",
    keywords: ["dashboard", "home", "analytics", "overview"],
    href: "/",
  },
  {
    id: "reports",
    label: "Reports",
    group: "pages",
    keywords: ["reports", "report", "charts", "summary"],
    href: "/reports",
  },
  {
    id: "history",
    label: "History",
    group: "pages",
    keywords: ["history", "past", "entries", "log"],
    href: "/history",
  },
  {
    id: "staff-page",
    label: "Staff",
    group: "pages",
    keywords: ["staff", "team", "employees", "people"],
    href: "/staff",
  },
  {
    id: "settings",
    label: "Settings",
    group: "pages",
    keywords: ["settings", "preferences", "config", "business"],
    href: "/settings",
  },
];

function resolveDefinition(
  definition: CommandDefinition,
  context: CommandContext
): ResolvedCommand | null {
  if (definition.isAvailable && !definition.isAvailable(context)) {
    return null;
  }

  const href =
    typeof definition.href === "function"
      ? definition.href(context)
      : definition.href;

  if (!href) return null;

  return {
    id: definition.id,
    label: definition.label,
    detail: definition.detail,
    group: definition.group,
    href,
    keywords: definition.keywords ?? [],
  };
}

function buildStaffCommands(context: CommandContext): ResolvedCommand[] {
  return context.staff
    .filter((member) => member.active)
    .map((member) => {
      const branchName = context.branchNames[member.branch];

      return {
        id: `staff-${member.id}`,
        label: member.name,
        detail: branchName,
        group: "staff" as const,
        href: "/staff",
        keywords: [member.name, branchName, "staff", "team", member.branch],
      };
    });
}

function buildBranchCommands(context: CommandContext): ResolvedCommand[] {
  return BRANCH_IDS.map((branchId) => {
    const branchName = context.branchNames[branchId];

    return {
      id: `branch-${branchId}`,
      label: branchName,
      detail: "View branch in History",
      group: "branches" as const,
      href: "/history",
      keywords: [branchName, branchId, "branch", "store", "location"],
    };
  });
}

function buildExpenseTemplateCommands(
  context: CommandContext
): ResolvedCommand[] {
  return context.templates
    .filter((template) => template.active)
    .map((template) => {
      const categoryLabel = getCategoryLabel(template.category);

      return {
        id: `template-${template.id}`,
        label: template.name,
        detail: categoryLabel,
        group: "expense-templates" as const,
        href: "/settings",
        keywords: [
          template.name,
          categoryLabel,
          template.category,
          "expense",
          "template",
        ],
      };
    });
}

export function buildCommandContext(
  entries: Entry[],
  staff: Staff[],
  branchNames: Record<Branch, string>,
  templates: ExpenseTemplate[]
): CommandContext {
  const draftEntry = findMostRecentEntryForDate(
    entries,
    getTodayISO(),
    "draft"
  );

  return { draftEntry, staff, branchNames, templates };
}

export function getCommands(context: CommandContext): ResolvedCommand[] {
  const staticCommands = COMMAND_DEFINITIONS.flatMap((definition) => {
    const resolved = resolveDefinition(definition, context);
    return resolved ? [resolved] : [];
  });

  return [
    ...staticCommands,
    ...buildStaffCommands(context),
    ...buildBranchCommands(context),
    ...buildExpenseTemplateCommands(context),
  ];
}

export function fuzzyMatch(query: string, text: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return true;

  const normalizedText = text.toLowerCase();
  let queryIndex = 0;

  for (
    let textIndex = 0;
    textIndex < normalizedText.length && queryIndex < normalizedQuery.length;
    textIndex++
  ) {
    if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === normalizedQuery.length;
}

export function filterCommands(
  commands: ResolvedCommand[],
  query: string
): ResolvedCommand[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return commands;

  return commands.filter((command) => {
    const searchable = [
      command.label,
      command.detail ?? "",
      ...command.keywords,
    ].join(" ");
    return fuzzyMatch(trimmedQuery, searchable);
  });
}

export function groupCommands(commands: ResolvedCommand[]) {
  return COMMAND_GROUP_ORDER.map((group) => ({
    group,
    label: COMMAND_GROUP_LABELS[group],
    commands: commands.filter((command) => command.group === group),
  })).filter((group) => group.commands.length > 0);
}
