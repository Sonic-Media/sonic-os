/**
 * JSON replacer that preserves BigInt precision by serializing as decimal strings.
 */
export function bigIntJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
}

export function stringifyJsonSafe(
  value: unknown,
  space?: string | number
): string {
  return JSON.stringify(value, bigIntJsonReplacer, space);
}
