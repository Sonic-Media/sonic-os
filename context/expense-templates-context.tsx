"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildExpensesFromActiveTemplates,
  getTemplateIds,
} from "@/lib/expense-templates";
import {
  getExpenseTemplates,
  normalizeExpenseTemplates,
  saveExpenseTemplates,
  sortExpenseTemplates,
} from "@/lib/expense-template-storage";
import { recordActivity } from "@/lib/activity-log";
import type { Expense, ExpenseBreakdownKey, ExpenseTemplate } from "@/types";

interface ExpenseTemplatesContextValue {
  templates: ExpenseTemplate[];
  activeTemplates: ExpenseTemplate[];
  templateIds: Set<string>;
  activeTemplateExpenses: Expense[];
  isLoaded: boolean;
  getTemplateById: (id: string) => ExpenseTemplate | undefined;
  addTemplate: (input: {
    name: string;
    category: ExpenseBreakdownKey;
    defaultAmount?: number;
  }) => ExpenseTemplate;
  updateTemplate: (
    id: string,
    patch: Partial<
      Pick<ExpenseTemplate, "name" | "category" | "defaultAmount" | "active">
    >
  ) => void;
  deactivateTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
}

const ExpenseTemplatesContext =
  createContext<ExpenseTemplatesContextValue | null>(null);

export function ExpenseTemplatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>(() =>
    getExpenseTemplates()
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const templatesRef = useRef(templates);

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      setTemplates(getExpenseTemplates());
      setIsLoaded(true);
    });
  }, []);

  const persistTemplates = useCallback((next: ExpenseTemplate[]) => {
    const normalized = normalizeExpenseTemplates(next);
    saveExpenseTemplates(normalized);
    templatesRef.current = normalized;
    setTemplates(normalized);
  }, []);

  const templateIds = useMemo(() => getTemplateIds(templates), [templates]);

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.active),
    [templates]
  );

  const activeTemplateExpenses = useMemo(
    () => buildExpensesFromActiveTemplates(templates),
    [templates]
  );

  const lookup = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const getTemplateById = useCallback(
    (id: string) => lookup.get(id),
    [lookup]
  );

  const addTemplate = useCallback(
    (input: {
      name: string;
      category: ExpenseBreakdownKey;
      defaultAmount?: number;
    }) => {
      const template: ExpenseTemplate = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        category: input.category,
        defaultAmount: input.defaultAmount,
        active: true,
      };
      persistTemplates([...templatesRef.current, template]);
      recordActivity({
        type: "template-updated",
        title: "Expense template updated",
        description: `${template.name} template was added.`,
      });
      return template;
    },
    [persistTemplates]
  );

  const updateTemplate = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<ExpenseTemplate, "name" | "category" | "defaultAmount" | "active">
      >
    ) => {
      persistTemplates(
        sortExpenseTemplates(
          templatesRef.current.map((template) => {
            if (template.id !== id) return template;

            const next: ExpenseTemplate = {
              ...template,
              ...patch,
              name:
                typeof patch.name === "string"
                  ? patch.name.trim() || template.name
                  : template.name,
            };

            if ("defaultAmount" in patch) {
              next.defaultAmount =
                patch.defaultAmount === undefined
                  ? undefined
                  : Math.max(0, patch.defaultAmount);
            }

            return next;
          })
        )
      );

      const updated = templatesRef.current.find((template) => template.id === id);
      if (updated) {
        recordActivity({
          type: "template-updated",
          title: "Expense template updated",
          description: `${updated.name} template was updated.`,
        });
      }
    },
    [persistTemplates]
  );

  const deactivateTemplate = useCallback(
    (id: string) => {
      updateTemplate(id, { active: false });
    },
    [updateTemplate]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      persistTemplates(templatesRef.current.filter((template) => template.id !== id));
    },
    [persistTemplates]
  );

  const value = useMemo(
    () => ({
      templates: sortExpenseTemplates(templates),
      activeTemplates,
      templateIds,
      activeTemplateExpenses,
      isLoaded,
      getTemplateById,
      addTemplate,
      updateTemplate,
      deactivateTemplate,
      deleteTemplate,
    }),
    [
      templates,
      activeTemplates,
      templateIds,
      activeTemplateExpenses,
      isLoaded,
      getTemplateById,
      addTemplate,
      updateTemplate,
      deactivateTemplate,
      deleteTemplate,
    ]
  );

  return (
    <ExpenseTemplatesContext.Provider value={value}>
      {children}
    </ExpenseTemplatesContext.Provider>
  );
}

export function useExpenseTemplates() {
  const context = useContext(ExpenseTemplatesContext);
  if (!context) {
    throw new Error(
      "useExpenseTemplates must be used within an ExpenseTemplatesProvider"
    );
  }
  return context;
}
