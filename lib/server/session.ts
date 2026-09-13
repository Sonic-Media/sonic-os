import { cache } from "react";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { isValidSignedSessionToken } from "@/lib/server/security/session-token";
import { normalizeUserRole } from "@/lib/auth/validation";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

export const SESSION_COOKIE_NAME = "sonic-os-session-token";

async function readSessionFromDatabase(
  token: string
): Promise<AuthSession | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          role: true,
          branch: true,
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (!session.user.active) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  if (!isValidSignedSessionToken(token)) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  return {
    userId: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: normalizeUserRole(session.user.role.slug),
    branch: session.user.branch.code as Branch,
    staffId: session.user.staffId ?? undefined,
    locked: session.locked,
    loggedInAt: session.createdAt.toISOString(),
  };
}

export function readSessionTokenFromHttpRequest(
  request?: Request
): string | null {
  if (!request) {
    return null;
  }

  const nextRequest = request as NextRequest;
  const fromCookieApi = nextRequest.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  if (fromCookieApi) {
    return fromCookieApi;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    if (name !== SESSION_COOKIE_NAME) {
      continue;
    }

    const value = trimmed.slice(separatorIndex + 1).trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}

async function readSessionToken(request?: Request): Promise<string | null> {
  const fromHttpRequest = readSessionTokenFromHttpRequest(request);
  if (fromHttpRequest) {
    return fromHttpRequest;
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

const getCachedSessionByToken = cache(
  async (token: string): Promise<AuthSession | null> => {
    return readSessionFromDatabase(token);
  }
);

export async function getSessionFromRequest(
  request?: Request
): Promise<AuthSession | null> {
  const token = await readSessionToken(request);
  if (!token) {
    return null;
  }

  return getCachedSessionByToken(token);
}

export async function requireSession(request?: Request): Promise<AuthSession> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new ApiError("Authentication required.", {
      status: 401,
      code: "unauthorized",
    });
  }

  if (session.locked) {
    throw new ApiError("Session is locked.", {
      status: 423,
      code: "locked",
    });
  }

  return session;
}

export async function getSessionTokenFromRequest(
  request?: Request
): Promise<string | null> {
  return readSessionToken(request);
}
