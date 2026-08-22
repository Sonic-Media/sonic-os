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
import { fetchSystemAuditLog } from "@/lib/api/system-audit-log";
import { useAuth } from "@/context/auth-context";
import {
  getDataSourceErrorMessage,
  loadFromApi,
} from "@/lib/data-source/context-api";
import {
  setStaffListCache,
  syncStaffAuditCacheFromAuditLog,
} from "@/lib/staff/audit";
import { fetchStaff } from "@/lib/api/staff";
import type { AuditLogFilterCriteria, AuditLogRecord } from "@/types/audit-log";

interface AuditLogContextValue {
  records: AuditLogRecord[];
  isLoaded: boolean;
  loadError: string | null;
  criteria: AuditLogFilterCriteria;
  setCriteria: (patch: Partial<AuditLogFilterCriteria>) => void;
  filteredRecords: AuditLogRecord[];
}

const AuditLogContext = createContext<AuditLogContextValue | null>(null);

export function AuditLogProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoaded: authLoaded, canViewAuditLog } = useAuth();
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [criteria, setCriteriaState] = useState<AuditLogFilterCriteria>(() =>
    createDefaultAuditLogFilters()
  );

  const refreshAuditLogFromApi = useCallback(async () => {
    const [auditRecords, staff] = await Promise.all([
      fetchSystemAuditLog(),
      fetchStaff(),
    ]);
    setRecords(auditRecords);
    syncStaffAuditCacheFromAuditLog(auditRecords);
    setStaffListCache(staff);
    setLoadError(null);
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (!isAuthenticated || !canViewAuditLog) {
      setRecords([]);
      setLoadError(null);
      setIsLoaded(true);
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        try {
          await loadFromApi(() => refreshAuditLogFromApi());
        } catch (error) {
          setLoadError(getDataSourceErrorMessage(error));
        } finally {
          setIsLoaded(true);
        }
      })();
    });
  }, [authLoaded, isAuthenticated, canViewAuditLog, refreshAuditLogFromApi]);

  useEffect(() => {
    function handleAuditUpdated(event: Event) {
      const record = (event as CustomEvent<AuditLogRecord>).detail;
      if (!record) return;
      setRecords((current) => {
        if (current.some((item) => item.id === record.id)) return current;
        const next = [record, ...current];
        syncStaffAuditCacheFromAuditLog(next);
        return next;
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
      loadError,
      criteria,
      setCriteria,
      filteredRecords,
    }),
    [records, isLoaded, loadError, criteria, setCriteria, filteredRecords]
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
