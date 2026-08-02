import { apiGet, apiPost } from "@/lib/api/client";
import type { AuthSession } from "@/types/auth";
import type { LoginInput } from "@/types/auth";

interface SessionPayload {
  session: AuthSession | null;
  activeBranchCode: string | null;
}

export async function fetchAuthSession(): Promise<SessionPayload> {
  return apiGet<SessionPayload>("/api/auth/session");
}

export async function loginApi(input: LoginInput): Promise<AuthSession> {
  const result = await apiPost<{ session: AuthSession }>("/api/auth/session", {
    action: "login",
    ...input,
  });
  return result.session;
}

export async function logoutApi(): Promise<void> {
  await apiPost<{ session: null }>("/api/auth/session", { action: "logout" });
}

export async function lockSessionApi(): Promise<AuthSession> {
  const result = await apiPost<{ session: AuthSession }>("/api/auth/session", {
    action: "lock",
  });
  return result.session;
}

export async function unlockSessionApi(password: string): Promise<AuthSession> {
  const result = await apiPost<{ session: AuthSession }>("/api/auth/session", {
    action: "unlock",
    password,
  });
  return result.session;
}

export async function setActiveBranchApi(branchCode: string): Promise<string> {
  const result = await apiPost<{ activeBranchCode: string }>(
    "/api/auth/session",
    {
      action: "set-active-branch",
      branchCode,
    }
  );
  return result.activeBranchCode;
}
