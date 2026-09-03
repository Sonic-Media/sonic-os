import bcrypt from "bcrypt";
import { verifyPassword as verifyLegacyPassword } from "@/lib/auth/password";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
}

export function isLegacyPasswordHash(passwordHash: string): boolean {
  return passwordHash.startsWith("local-");
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (!passwordHash.trim()) {
    return false;
  }

  if (isLegacyPasswordHash(passwordHash)) {
    return verifyLegacyPassword(password, passwordHash);
  }

  return bcrypt.compare(password.trim(), passwordHash);
}
