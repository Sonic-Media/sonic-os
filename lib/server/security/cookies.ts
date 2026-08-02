import { isProductionEnvironment, isStagingEnvironment } from "@/lib/env";

export function shouldUseSecureCookies(): boolean {
  return isProductionEnvironment() || isStagingEnvironment();
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: expiresAt,
  };
}

export function getClearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 0,
  };
}
