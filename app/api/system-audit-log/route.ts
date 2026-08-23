import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createAuditLogEntry,
  listAuditLogEntries,
} from "@/lib/server/services/system-audit-log-service";
import { getSessionFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  try {
    const records = await withDatabase(() => listAuditLogEntries(), {
      request,
      permission: "view_audit_log",
    });
    return jsonOk(records);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await getSessionFromRequest();

    const record = await withDatabase(
      () =>
        createAuditLogEntry(body, session
          ? {
              userId: session.userId,
              userName: session.displayName,
              role: session.role,
              branch: session.branch,
            }
          : undefined),
      { request, module: "operations" }
    );
    return jsonCreated(record);
  } catch (error) {
    return handleRouteError(error);
  }
}
