"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUDIT_LOG_UPDATED_EVENT } from "@/lib/audit-log/constants";
import {
  createDefaultAuditLogFilters,
  filterAuditLogRecords,
} from "@/lib/audit-log/filters";
import { getAuditLogRecords } from "@/lib/audit-log/storage";
import { migrateLegacyStaffAuditToSystemLog } from "@/lib/audit-log/migrate";
import type { AuditLogFilterCriteria, AuditLogRecord } from "@/types/audit-log";

interface AuditLogContextValue {
  records: AuditLogRecord[];
  isLoaded: boolean;
  criteria: AuditLogFilterCriteria;
  setCriteria: (patch: Partial<AuditLogFilterCriteria>) => void;
  filteredRecords: AuditLogRecord[];
}

const AuditLogContext = createContext<AuditLogContextValue | null>(null);

export function AuditLogProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [criteria, setCriteriaState] = useState<AuditLogFilterCriteria>(() =>
    createDefaultAuditLogFilters()
  );

  useEffect(() => {
    queueMicrotask(() => {
      migrateLegacyStaffAuditToSystemLog();
      setRecords(getAuditLogRecords());
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    function handleAuditUpdated(event: Event) {
      const record = (event as CustomEvent<AuditLogRecord>).detail;
      if (!record) return;
      setRecords((current) => {
        if (current.some((item) => item.id === record.id)) return current;
        return [record, ...current];
      });
    }

    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
    return () => {
      window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, handleAuditUpdated);
    };
  }, []);

  const setCriteria = useCallback((patch: Partial<AuditLogFilterCriteria>) => {
    setCriteriaState((current) => ({ ...current, ...patch }));
  }, []);

  const filteredRecords = useMemo(
    () => filterAuditLogRecords(records, criteria),
    [records, criteria]
  );

  const value = useMemo(
    () => ({
      records,
      isLoaded,
      criteria,
      setCriteria,
      filteredRecords,
    }),
    [records, isLoaded, criteria, setCriteria, filteredRecords]
  );

  return (
    <AuditLogContext.Provider value={value}>{children}</AuditLogContext.Provider>
  );
}

export function useAuditLog() {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error("useAuditLog must be used within an AuditLogProvider");
  }
  return context;
}
