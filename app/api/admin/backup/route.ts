import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  listBackupRecords,
  triggerDatabaseBackup,
} from "@/lib/server/backup/backup-service";
import { requireSession } from "@/lib/server/session";

export const maxDuration = 60;

function logBackupRouteError(
  method: string,
  error: unknown
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      event: "backup.route.error",
      timestamp: new Date().toISOString(),
      method,
      pathname: "/api/admin/backup",
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    })
  );
}

export async function GET() {
  try {
    const backups = await withDatabase(async () => listBackupRecords(20), {
      ownerOnly: true,
    });
    return jsonOk(backups);
  } catch (error) {
    logBackupRouteError("GET", error);
    return handleRouteError(error, {
      method: "GET",
      pathname: "/api/admin/backup",
    });
  }
}

export async function POST(request: Request) {
  try {
    const backup = await withDatabase(
      async () => {
        const session = await requireSession();
        return triggerDatabaseBackup({
          trigger: "manual",
          createdById: session.userId,
          createdByName: session.displayName,
        });
      },
      { request, ownerOnly: true }
    );

    return jsonOk(backup);
  } catch (error) {
    logBackupRouteError("POST", error);
    return handleRouteError(error, {
      method: "POST",
      pathname: "/api/admin/backup",
    });
  }
}
