import { cache } from "react";
import { headers, cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { isValidSignedSessionToken } from "@/lib/server/security/session-token";
import type { AuthSession, UserRole } from "@/types/auth";
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

  const roleSlug = session.user.role.slug as UserRole;

  return {
    userId: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: roleSlug,
    branch: session.user.branch.code as Branch,
    staffId: session.user.staffId ?? undefined,
    locked: session.locked,
    loggedInAt: session.createdAt.toISOString(),
  };
}

export const getSessionFromRequest = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return readSessionFromDatabase(token);
});

export async function requireSession(): Promise<AuthSession> {
  const session = await getSessionFromRequest();
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

export async function getSessionTokenFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
