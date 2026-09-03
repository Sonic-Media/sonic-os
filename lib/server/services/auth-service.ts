import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { isOwnerRole } from "@/lib/auth/validation";
import { prisma } from "@/lib/db";
import { hashPassword, isLegacyPasswordHash, verifyPassword } from "@/lib/server/password";
import { recordSecurityAuditInTransaction } from "@/lib/server/security/audit";
import {
  getClearSessionCookieOptions,
  getSessionCookieOptions,
} from "@/lib/server/security/cookies";
import {
  checkRateLimit,
  getClientRateLimitKey,
} from "@/lib/server/security/rate-limit";
import { logSecurityEvent } from "@/lib/server/security/logging";
import { createSignedSessionToken } from "@/lib/server/security/session-token";
import {
  SESSION_COOKIE_NAME,
  getSessionFromRequest,
} from "@/lib/server/session";
import { normalizeUserRole } from "@/lib/auth/validation";
import { loginSchema } from "@/lib/validation/auth";
import type { AuthSession } from "@/types/auth";
import type { Branch } from "@/types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };
const GENERIC_LOGIN_ERROR = "Invalid username or password.";

function isDevelopmentAuth(): boolean {
  return process.env.NODE_ENV === "development";
}

function loginErrorMessage(detail: string): string {
  return isDevelopmentAuth() ? detail : GENERIC_LOGIN_ERROR;
}

type LoginFailureReason =
  | "user_not_found"
  | "incorrect_password"
  | "login_disabled"
  | "user_inactive"
  | "user_deleted";

function mapSession(
  session: {
    createdAt: Date;
    locked: boolean;
    user: {
      id: string;
      username: string;
      displayName: string;
      staffId: string | null;
      role: { slug: string };
      branch: { code: string };
    };
  }
): AuthSession {
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

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getClearSessionCookieOptions());
}

async function recordFailedLogin(
  username: string,
  reason: string,
  context?: { userId: string; branchCode: string }
): Promise<void> {
  if (!context) {
    logSecurityEvent("security.login_failed", { username, reason });
    return;
  }

  await prisma.authAuditLog.create({
    data: {
      userId: context.userId,
      username,
      branchCode: context.branchCode,
      action: "login-failed",
      detail: reason,
    },
  });
}

export async function login(
  input: unknown,
  request?: Request
): Promise<AuthSession> {
  if (request) {
    const rateLimit = checkRateLimit(
      getClientRateLimitKey(request, "auth:login"),
      LOGIN_RATE_LIMIT
    );

    if (!rateLimit.allowed) {
      logSecurityEvent("security.rate_limit", {
        scope: "auth:login",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });

      throw new ApiError("Too many login attempts. Try again later.", {
        status: 429,
        code: "rate_limited",
      });
    }
  }

  const parsed = loginSchema.parse(input);
  const username = parsed.username.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: { username },
    include: {
      role: true,
      branch: true,
      staff: {
        select: {
          loginEnabled: true,
          deletedAt: true,
          active: true,
        },
      },
    },
  });

  const rejectLogin = async (
    reason: LoginFailureReason,
    detail: string,
    context?: { userId: string; branchCode: string }
  ): Promise<never> => {
    await recordFailedLogin(username, detail, context);
    throw new ApiError(loginErrorMessage(detail), {
      status: 401,
      code: reason,
    });
  };

  if (!user) {
    throw await rejectLogin("user_not_found", "User not found.");
  }

  const resolvedUser = user;

  if (resolvedUser.staff?.deletedAt) {
    throw await rejectLogin("user_deleted", "User deleted.", {
      userId: resolvedUser.id,
      branchCode: resolvedUser.branch.code,
    });
  }

  if (!resolvedUser.active) {
    throw await rejectLogin("user_inactive", "User inactive.", {
      userId: resolvedUser.id,
      branchCode: resolvedUser.branch.code,
    });
  }

  if (resolvedUser.staff && !resolvedUser.staff.active) {
    throw await rejectLogin("user_inactive", "User inactive.", {
      userId: resolvedUser.id,
      branchCode: resolvedUser.branch.code,
    });
  }

  if (resolvedUser.staff && !resolvedUser.staff.loginEnabled) {
    throw await rejectLogin("login_disabled", "Login disabled.", {
      userId: resolvedUser.id,
      branchCode: resolvedUser.branch.code,
    });
  }

  if (!resolvedUser.passwordHash.trim()) {
    throw await rejectLogin("incorrect_password", "Incorrect password.", {
      userId: resolvedUser.id,
      branchCode: resolvedUser.branch.code,
    });
  }

  const valid = await verifyPassword(parsed.password, resolvedUser.passwordHash);
  if (!valid) {
    throw await rejectLogin("incorrect_password", "Incorrect password.", {
      userId: resolvedUser.id,
      branchCode: resolvedUser.branch.code,
    });
  }

  const token = createSignedSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const now = new Date();
  const shouldUpgradePasswordHash = isLegacyPasswordHash(resolvedUser.passwordHash);
  const upgradedPasswordHash = shouldUpgradePasswordHash
    ? await hashPassword(parsed.password)
    : null;

  const session = await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: { userId: resolvedUser.id },
    });

    await tx.user.update({
      where: { id: resolvedUser.id },
      data: {
        lastLoginAt: now,
        ...(upgradedPasswordHash
          ? { passwordHash: upgradedPasswordHash }
          : {}),
      },
    });

    const created = await tx.session.create({
      data: {
        token,
        userId: resolvedUser.id,
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

    await recordSecurityAuditInTransaction(
      tx,
      null,
      "login",
      `${resolvedUser.displayName} signed in`,
      {
        userId: resolvedUser.id,
        username: resolvedUser.username,
        branchCode: resolvedUser.branch.code,
      }
    );

    return created;
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
      await prisma.$transaction(async (tx) => {
        await recordSecurityAuditInTransaction(
          tx,
          null,
          "logout",
          `${session.user.displayName} signed out`,
          {
            userId: session.userId,
            username: session.user.username,
            branchCode: session.user.branch.code,
          }
        );
        await tx.session.delete({ where: { token } });
      });
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

export async function unlockSession(
  password: string,
  request?: Request
): Promise<AuthSession> {
  if (request) {
    const rateLimit = checkRateLimit(
      getClientRateLimitKey(request, "auth:unlock"),
      LOGIN_RATE_LIMIT
    );

    if (!rateLimit.allowed) {
      throw new ApiError("Too many unlock attempts. Try again later.", {
        status: 429,
        code: "rate_limited",
      });
    }
  }

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
    await recordFailedLogin(
      session.user.username,
      "Incorrect unlock password.",
      {
        userId: session.userId,
        branchCode: session.user.branch.code,
      }
    );
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
  const normalized = branchCode.trim().toLowerCase();
  const branch = await prisma.branch.findUnique({
    where: { code: normalized },
    select: { id: true, active: true },
  });

  if (!branch?.active) {
    throw new ApiError("Branch not found or inactive.", {
      status: 404,
      code: "branch_not_found",
    });
  }

  await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      activeBranchCode: normalized,
    },
    update: {
      activeBranchCode: normalized,
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
