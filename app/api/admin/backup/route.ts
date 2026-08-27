import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  listBackupRecords,
  triggerDatabaseBackup,
} from "@/lib/server/backup/backup-service";
import { requireSession } from "@/lib/server/session";

export async function GET() {
  try {
    const backups = await withDatabase(async () => listBackupRecords(20), {
      ownerOnly: true,
    });
    return jsonOk(backups);
  } catch (error) {
    return handleRouteError(error);
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
    return handleRouteError(error);
  }
}
