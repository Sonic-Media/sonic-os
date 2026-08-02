export function pickAuditFields<T extends object>(
  value: T,
  keys: (keyof T)[]
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    const field = value[key];
    if (field !== undefined) {
      snapshot[String(key)] = field;
    }
  }
  return snapshot;
}
