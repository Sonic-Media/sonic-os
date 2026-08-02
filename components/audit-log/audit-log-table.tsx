"use client";

import { Fragment, useState } from "react";
import { TablePagination } from "@/components/shared/table-pagination";
import { Card } from "@/components/shared/ui/card";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useSettings } from "@/context/settings-context";
import { getStaffRoleName } from "@/lib/staff/roles";
import type { AuditLogRecord } from "@/types/audit-log";
import type { StaffRoleId } from "@/types/staff-role";

interface AuditLogTableProps {
  records: AuditLogRecord[];
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;

  return parsed.toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatValues(values: Record<string, unknown> | null | undefined): string {
  if (!values) return "—";
  try {
    return JSON.stringify(values, null, 2);
  } catch {
    return "—";
  }
}

export function AuditLogTable({ records }: AuditLogTableProps) {
  const { getBranchName } = useSettings();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pagination = usePaginatedList(records);
  const { pageItems } = pagination;

  if (records.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">No audit records match your filters.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/80">
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Timestamp
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                User
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Role
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Branch
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Module
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Action
              </th>
              <th className="px-5 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Record
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((record) => {
              const isExpanded = expandedId === record.id;
              const hasChanges =
                Boolean(record.oldValues) || Boolean(record.newValues);

              return (
                <Fragment key={record.id}>
                  <tr
                    className="border-b border-zinc-800/60 transition-colors hover:bg-zinc-900/40"
                  >
                    <td className="px-5 py-4 text-zinc-400">
                      {formatTimestamp(record.timestamp)}
                    </td>
                    <td className="px-5 py-4 text-white">{record.userName}</td>
                    <td className="px-5 py-4 text-zinc-400">
                      {record.role === "owner"
                        ? "Owner"
                        : getStaffRoleName(record.role as StaffRoleId)}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {getBranchName(record.branch)}
                    </td>
                    <td className="px-5 py-4 capitalize text-zinc-400">
                      {record.module}
                    </td>
                    <td className="px-5 py-4 font-medium text-white">
                      {record.action}
                    </td>
                    <td className="px-5 py-4">
                      {hasChanges ? (
                        <button
                          type="button"
                          className="text-xs text-zinc-400 underline-offset-2 hover:text-white hover:underline"
                          onClick={() =>
                            setExpandedId((current) =>
                              current === record.id ? null : record.id
                            )
                          }
                        >
                          {record.recordId ?? "View changes"}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {record.recordId ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasChanges && (
                    <tr
                      key={`${record.id}-details`}
                      className="border-b border-zinc-800/60 bg-zinc-950/40"
                    >
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                              Old Values
                            </p>
                            <pre className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-black/40 p-3 text-xs text-zinc-300">
                              {formatValues(record.oldValues)}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                              New Values
                            </p>
                            <pre className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-black/40 p-3 text-xs text-zinc-300">
                              {formatValues(record.newValues)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPrevious={pagination.goToPreviousPage}
        onNext={pagination.goToNextPage}
      />
    </Card>
  );
}
