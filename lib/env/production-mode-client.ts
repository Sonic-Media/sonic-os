export function isProductionModeClient(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return process.env.NEXT_PUBLIC_APP_MODE?.trim().toLowerCase() === "production";
}
