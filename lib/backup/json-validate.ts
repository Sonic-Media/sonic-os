import type { JsonBackupPayload } from "@/lib/backup/json-export";

export const JSON_BACKUP_SUPPORTED_VERSIONS = new Set([1]);

/** Tables exported by `exportDatabaseJson` — BackupRecord is validated but not applied. */
export const JSON_BACKUP_TABLE_KEYS = [
  "Role",
  "Branch",
  "User",
  "Session",
  "UserPreference",
  "AuthAuditLog",
  "Staff",
  "AppSetting",
  "ExpenseTemplate",
  "DailyOperation",
  "DailyOperationExpense",
  "ProductCategory",
  "Product",
  "StockMovement",
  "StockPriceChange",
  "Customer",
  "Sale",
  "SaleLineItem",
  "Supplier",
  "Purchase",
  "PurchaseLineItem",
  "ExpenseCategory",
  "ExpenseRecord",
  "DayClosing",
  "AuditLogEntry",
  "ActivityLog",
  "StaffPayment",
  "BackupRecord",
] as const;

export type JsonBackupTableKey = (typeof JSON_BACKUP_TABLE_KEYS)[number];

export class BackupValidationError extends Error {
  readonly code: string;

  constructor(message: string, code = "invalid_backup") {
    super(message);
    this.name = "BackupValidationError";
    this.code = code;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate a parsed Sonic OS JSON backup payload.
 * Throws BackupValidationError on any structural problem — callers must not mutate data.
 */
export function validateJsonBackupPayload(value: unknown): JsonBackupPayload {
  if (value === null || value === undefined) {
    throw new BackupValidationError("Backup file is empty.", "empty_backup");
  }

  if (!isPlainObject(value)) {
    throw new BackupValidationError(
      "Backup is not a valid Sonic OS JSON document.",
      "invalid_backup"
    );
  }

  const version = value.version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new BackupValidationError(
      "Backup is missing a valid version number.",
      "missing_required_fields"
    );
  }

  if (!JSON_BACKUP_SUPPORTED_VERSIONS.has(version)) {
    throw new BackupValidationError(
      `Unsupported backup version (${version}). This app supports version 1.`,
      "unsupported_backup_version"
    );
  }

  if (value.format !== "json") {
    throw new BackupValidationError(
      "This file is not a Sonic OS JSON backup.",
      "incompatible_backup"
    );
  }

  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) {
    throw new BackupValidationError(
      "Backup is missing createdAt.",
      "missing_required_fields"
    );
  }

  if (typeof value.database !== "string" || !value.database.trim()) {
    throw new BackupValidationError(
      "Backup is missing database metadata.",
      "missing_required_fields"
    );
  }

  if (typeof value.host !== "string") {
    throw new BackupValidationError(
      "Backup is missing host metadata.",
      "missing_required_fields"
    );
  }

  if (!isPlainObject(value.tables)) {
    throw new BackupValidationError(
      "Backup is missing the tables payload.",
      "missing_required_fields"
    );
  }

  const tables = value.tables;
  for (const key of JSON_BACKUP_TABLE_KEYS) {
    if (!(key in tables)) {
      throw new BackupValidationError(
        `Backup is missing required table "${key}".`,
        "missing_required_fields"
      );
    }
    if (!Array.isArray(tables[key])) {
      throw new BackupValidationError(
        `Backup table "${key}" must be an array.`,
        "invalid_backup"
      );
    }
  }

  const roleRows = tables.Role as unknown[];
  const branchRows = tables.Branch as unknown[];
  if (roleRows.length === 0) {
    throw new BackupValidationError(
      "Backup has no roles and cannot be restored safely.",
      "invalid_backup"
    );
  }
  if (branchRows.length === 0) {
    throw new BackupValidationError(
      "Backup has no branches and cannot be restored safely.",
      "invalid_backup"
    );
  }

  return value as unknown as JsonBackupPayload;
}
