/**
 * Safe JSON serialization for database backup payloads.
 *
 * Prisma returns JavaScript BigInt for schema BigInt columns (e.g.
 * DailyOperation.timestamp, BackupRecord.fileSizeBytes). Native
 * JSON.stringify throws on BigInt ("Do not know how to serialize a BigInt").
 *
 * Policy: serialize BigInt as a decimal string to preserve precision.
 * Do NOT coerce BigInt through Number (unsafe above 2^53 - 1).
 */

export type JsonSafePrimitive = string | number | boolean | null;
export type JsonSafeValue =
  | JsonSafePrimitive
  | JsonSafeValue[]
  | { [key: string]: JsonSafeValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Recursively convert a value into a JSON-safe structure.
 * BigInt → decimal string. Date → ISO string. Other primitives preserved.
 */
export function serializeJsonValue(value: unknown): JsonSafeValue {
  if (typeof value === "bigint") {
    return value.toString(10);
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeJsonValue(entry));
  }

  // Node Buffer / Uint8Array — keep a compact, JSON-safe representation.
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return {
      __type: "Buffer",
      data: Array.from(value),
    };
  }

  if (value instanceof Uint8Array) {
    return {
      __type: "Uint8Array",
      data: Array.from(value),
    };
  }

  if (isPlainObject(value)) {
    const result: { [key: string]: JsonSafeValue } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) {
        continue;
      }
      result[key] = serializeJsonValue(entry);
    }
    return result;
  }

  // Prisma Decimal and similar objects often expose toJSON / toString.
  if (typeof value === "object") {
    const withToJson = value as { toJSON?: () => unknown };
    if (typeof withToJson.toJSON === "function") {
      return serializeJsonValue(withToJson.toJSON());
    }

    const withToString = value as { toString?: () => string };
    if (
      typeof withToString.toString === "function" &&
      withToString.toString !== Object.prototype.toString
    ) {
      return withToString.toString();
    }
  }

  // Last resort: drop unsupported values rather than crash backup.
  return null;
}

/**
 * JSON.stringify that never throws on BigInt.
 * Applies recursive pre-normalization, then a replacer safety net.
 */
export function stringifyJsonSafe(
  value: unknown,
  space?: string | number
): string {
  const normalized = serializeJsonValue(value);
  return `${JSON.stringify(
    normalized,
    (_key, entry) => (typeof entry === "bigint" ? entry.toString(10) : entry),
    space
  )}`;
}
