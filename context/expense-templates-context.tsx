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
  createExpenseTemplateApi,
  deleteExpenseTemplateApi,
  fetchExpenseTemplates,
  updateExpenseTemplateApi,
} from "@/lib/api/expense-templates";
import { useAuth } from "@/context/auth-context";
import {
  getDataSourceErrorMessage,
  loadFromApi,
  runOnApi,
} from "@/lib/data-source/context-api";
import {
  buildExpensesFromActiveTemplates,
  getTemplateIds,
} from "@/lib/expense-templates";
import { sortExpenseTemplates } from "@/lib/expense-template-storage";
import { recordActivity } from "@/lib/activity-log";
import type { Expense, ExpenseBreakdownKey, ExpenseTemplate } from "@/types";

interface ExpenseTemplatesContextValue {
  templates: ExpenseTemplate[];
  activeTemplates: ExpenseTemplate[];
  templateIds: Set<string>;
  activeTemplateExpenses: Expense[];
  isLoaded: boolean;
  loadError: string | null;
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
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const templatesRef = useRef(templates);

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  const refreshTemplatesFromApi = useCallback(async () => {
    const remoteTemplates = await fetchExpenseTemplates();
    const normalized = sortExpenseTemplates(remoteTemplates);
    templatesRef.current = normalized;
    setTemplates(normalized);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (hasLoaded.current && !isAuthenticated) {
      templatesRef.current = [];
      setTemplates([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (!isAuthenticated) {
      templatesRef.current = [];
      setTemplates([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshTemplatesFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, refreshTemplatesFromApi]);

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
      const optimistic: ExpenseTemplate = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        category: input.category,
        defaultAmount: input.defaultAmount,
        active: true,
      };

      void (async () => {
        try {
          const created = await runOnApi(() => createExpenseTemplateApi(input));
          await refreshTemplatesFromApi();
          recordActivity({
            type: "template-updated",
            title: "Expense template updated",
            description: `${created.name} template was added.`,
          });
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();

      return optimistic;
    },
    [refreshTemplatesFromApi]
  );

  const updateTemplate = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<ExpenseTemplate, "name" | "category" | "defaultAmount" | "active">
      >
    ) => {
      void (async () => {
        try {
          await runOnApi(() => updateExpenseTemplateApi(id, patch));
          await refreshTemplatesFromApi();
          const updated = templatesRef.current.find((template) => template.id === id);
          if (updated) {
            recordActivity({
              type: "template-updated",
              title: "Expense template updated",
              description: `${updated.name} template was updated.`,
            });
          }
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshTemplatesFromApi]
  );

  const deactivateTemplate = useCallback(
    (id: string) => {
      updateTemplate(id, { active: false });
    },
    [updateTemplate]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await runOnApi(() => deleteExpenseTemplateApi(id));
          await refreshTemplatesFromApi();
        } catch (error) {
          console.error(getDataSourceErrorMessage(error));
        }
      })();
    },
    [refreshTemplatesFromApi]
  );

  const value = useMemo(
    () => ({
      templates: sortExpenseTemplates(templates),
      activeTemplates,
      templateIds,
      activeTemplateExpenses,
      isLoaded,
      loadError,
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
      loadError,
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
