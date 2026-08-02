import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import {
  SESSION_COOKIE_NAME,
  getSessionFromRequest,
} from "@/lib/server/session";
import { loginSchema } from "@/lib/validation/auth";
import type { AuthSession, UserRole } from "@/types/auth";
import type { Branch } from "@/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function mapSession(
  session: {
    createdAt: Date;
    locked: boolean;
    user: {
      id: string;
      username: string;
      displayName: string;
      role: { slug: string };
      branch: { code: string };
    };
  }
): AuthSession {
  return {
    userId: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role.slug as UserRole,
    branch: session.user.branch.code as Branch,
    locked: session.locked,
    loggedInAt: session.createdAt.toISOString(),
  };
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function login(input: unknown): Promise<AuthSession> {
  const parsed = loginSchema.parse(input);
  const username = parsed.username.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { username, active: true },
    include: {
      role: true,
      branch: true,
    },
  });

  if (!user) {
    throw new ApiError("Invalid username or password.", {
      status: 401,
      code: "invalid_credentials",
    });
  }

  const valid = await verifyPassword(parsed.password, user.passwordHash);
  if (!valid) {
    throw new ApiError("Invalid username or password.", {
      status: 401,
      code: "invalid_credentials",
    });
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
    include: {
      user: {
        include: {
          role: true,
          branch: true,
        },
      },
    },
  });

  await prisma.authAuditLog.create({
    data: {
      userId: user.id,
      username: user.username,
      branchCode: user.branch.code,
      action: "login",
      detail: `${user.displayName} signed in`,
    },
  });

  await setSessionCookie(token, expiresAt);

  return mapSession(session);
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { branch: true },
        },
      },
    });

    if (session) {
      await prisma.authAuditLog.create({
        data: {
          userId: session.userId,
          username: session.user.username,
          branchCode: session.user.branch.code,
          action: "logout",
          detail: `${session.user.displayName} signed out`,
        },
      });
      await prisma.session.delete({ where: { token } });
    }
  }

  await clearSessionCookie();
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  return getSessionFromRequest();
}

export async function lockSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new ApiError("Session not found.", { status: 401, code: "unauthorized" });
  }

  const session = await prisma.session.update({
    where: { token },
    data: { locked: true },
    include: {
      user: {
        include: {
          role: true,
          branch: true,
        },
      },
    },
  });

  return mapSession(session);
}

export async function unlockSession(password: string): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new ApiError("Session not found.", { status: 401, code: "unauthorized" });
  }

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

  if (!session) {
    throw new ApiError("Session not found.", { status: 401, code: "unauthorized" });
  }

  const valid = await verifyPassword(password, session.user.passwordHash);
  if (!valid) {
    throw new ApiError("Incorrect password.", {
      status: 401,
      code: "invalid_password",
    });
  }

  const next = await prisma.session.update({
    where: { token },
    data: { locked: false },
    include: {
      user: {
        include: {
          role: true,
          branch: true,
        },
      },
    },
  });

  return mapSession(next);
}

export async function updateActiveBranchPreference(
  userId: string,
  branchCode: string
): Promise<void> {
  await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      activeBranchCode: branchCode.toLowerCase(),
    },
    update: {
      activeBranchCode: branchCode.toLowerCase(),
    },
  });
}

export async function getActiveBranchPreference(
  userId: string
): Promise<string | null> {
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });

  return preference?.activeBranchCode ?? null;
}

export { hashPassword };
