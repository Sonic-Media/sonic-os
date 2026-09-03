import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getCurrentSession,
  lockSession,
  login,
  logout,
  unlockSession,
  updateActiveBranchPreference,
  getActiveBranchPreference,
} from "@/lib/server/services/auth-service";
import { isOwnerRole } from "@/lib/auth/validation";
import { activeBranchSchema, loginSchema } from "@/lib/validation/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import { requireSession } from "@/lib/server/session";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return jsonOk({ session: null, activeBranchCode: null });
    }

    const session = await getCurrentSession();
    if (!session) {
      return jsonOk({ session: null, activeBranchCode: null });
    }

    const activeBranchCode = await getActiveBranchPreference(session.userId);

    return jsonOk({ session, activeBranchCode });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      throw new ApiError("Database is not configured.", {
        status: 503,
        code: "database_unavailable",
      });
    }

    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "login";

    if (action === "login") {
      const parsed = loginSchema.parse(body);
      const session = await login(parsed, request);
      return jsonOk({ session });
    }

    if (action === "logout") {
      await logout();
      return jsonOk({ session: null });
    }

    if (action === "lock") {
      await requireSession();
      const session = await lockSession();
      return jsonOk({ session });
    }

    if (action === "unlock") {
      await requireSession();
      const password = typeof body.password === "string" ? body.password : "";
      const session = await unlockSession(password, request);
      return jsonOk({ session });
    }

    if (action === "set-active-branch") {
      const session = await requireSession();
      if (!isOwnerRole(session.role)) {
        throw new ApiError("Only the owner can switch branches.", {
          status: 403,
          code: "forbidden",
        });
      }
      const parsed = activeBranchSchema.parse(body);
      await updateActiveBranchPreference(session.userId, parsed.branchCode);
      return jsonOk({ activeBranchCode: parsed.branchCode.toLowerCase() });
    }

    throw new ApiError("Unsupported auth action.", {
      status: 400,
      code: "unsupported_action",
    });
  } catch (error) {
    return jsonError(error);
  }
}
