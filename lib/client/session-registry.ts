import type { AuthSession } from "@/types/auth";

let currentSession: AuthSession | null = null;

export function setClientSession(session: AuthSession | null): void {
  currentSession = session;
}

export function getClientSession(): AuthSession | null {
  return currentSession;
}
