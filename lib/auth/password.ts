const LOCAL_PASSWORD_SALT = "sonic-os-local-auth-v2.4";

export function hashPassword(password: string): string {
  const value = `${LOCAL_PASSWORD_SALT}:${password.trim()}`;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `local-${Math.abs(hash).toString(16)}-${value.length}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return hashPassword(password) === passwordHash;
}

export const DEFAULT_OWNER_PASSWORD = "owner";

export const DEFAULT_OWNER_PASSWORD_HASH = hashPassword(DEFAULT_OWNER_PASSWORD);
