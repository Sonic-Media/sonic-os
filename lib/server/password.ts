import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password.trim(), BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (passwordHash.startsWith("local-")) {
    return false;
  }

  return bcrypt.compare(password.trim(), passwordHash);
}
