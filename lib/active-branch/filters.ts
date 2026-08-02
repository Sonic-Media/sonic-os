import type { Branch } from "@/types";

export function filterRecordsByBranch<T>(
  records: T[],
  branch: Branch,
  getBranch: (record: T) => Branch | undefined
): T[] {
  return records.filter((record) => getBranch(record) === branch);
}

export function filterByBranchField<T extends { branch: Branch }>(
  records: T[],
  branch: Branch
): T[] {
  return records.filter((record) => record.branch === branch);
}
