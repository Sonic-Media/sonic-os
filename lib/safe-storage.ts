function getLocalStorage(): Storage | null {
  const scope = globalThis as typeof globalThis & { window?: Window };
  if (typeof scope.window === "undefined") return null;

  try {
    return scope.window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalStorageItem(key: string): string | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageItem(key: string, value: string): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorageItem(key: string): void {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}

export function readLocalStorageJson<T>(key: string, fallback: T): T {
  const raw = readLocalStorageItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    removeLocalStorageItem(key);
    return fallback;
  }
}
