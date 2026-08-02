import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getServerEnv } from "@/lib/env";

function getSessionSecret(): string {
  const secret = getServerEnv().SESSION_SECRET?.trim();

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured in production.");
  }

  return "development-only-session-secret-minimum-32-characters";
}

function signToken(nonce: string): string {
  return createHmac("sha256", getSessionSecret()).update(nonce).digest("hex");
}

export function createSignedSessionToken(): string {
  const nonce = randomBytes(32).toString("hex");
  return `${nonce}.${signToken(nonce)}`;
}

export function isValidSignedSessionToken(token: string): boolean {
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature || nonce.length !== 64) {
    return false;
  }

  const expected = signToken(nonce);

  try {
    return timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}
