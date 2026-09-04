import { jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { handleRouteError, ensureDatabaseConfigured } from "@/lib/server/route-handler";
import { triggerDatabaseBackup } from "@/lib/server/backup/backup-service";

export const maxDuration = 60;

function authorizeCronRequest(request: Request): void {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    throw new ApiError(
      "CRON_SECRET is not configured. Add it in Vercel project settings to enable scheduled backups.",
      { status: 503, code: "cron_not_configured" }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw new ApiError("Unauthorized cron request.", {
      status: 401,
      code: "unauthorized",
    });
  }
}

function logCronBackupError(error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      event: "backup.cron.error",
      timestamp: new Date().toISOString(),
      pathname: "/api/cron/backup",
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    })
  );
}

export async function GET(request: Request) {
  try {
    authorizeCronRequest(request);
    ensureDatabaseConfigured();

    const backup = await triggerDatabaseBackup({ trigger: "scheduled" });

    if (backup.status === "failed") {
      throw new ApiError(backup.error ?? "Scheduled database backup failed.", {
        status: 500,
        code: "backup_failed",
        details: { backupId: backup.id },
      });
    }

    return jsonOk(backup);
  } catch (error) {
    logCronBackupError(error);
    return handleRouteError(error, {
      method: "GET",
      pathname: "/api/cron/backup",
    });
  }
}
