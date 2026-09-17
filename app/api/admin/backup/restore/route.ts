import { jsonOk } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  restoreBackupById,
  restoreBackupFromUpload,
} from "@/lib/server/backup/restore-service";
import { requireSession } from "@/lib/server/session";
import { requireOwner } from "@/lib/server/security/authorization";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const result = await withDatabase(
      async () => {
        const session = await requireSession();
        requireOwner(session);

        const contentType = request.headers.get("content-type") ?? "";

        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            throw new ApiError("Choose a .json or .json.gz backup file.", {
              status: 400,
              code: "invalid_request",
            });
          }

          const buffer = new Uint8Array(await file.arrayBuffer());
          return restoreBackupFromUpload({
            bytes: buffer,
            fileName: file.name || "backup.json.gz",
            session,
            request,
          });
        }

        const body = (await request.json().catch(() => null)) as {
          backupId?: string;
        } | null;

        if (!body?.backupId?.trim()) {
          throw new ApiError("backupId is required.", {
            status: 400,
            code: "invalid_request",
          });
        }

        return restoreBackupById({
          backupId: body.backupId.trim(),
          session,
          request,
        });
      },
      { request, ownerOnly: true }
    );

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error, {
      method: "POST",
      pathname: "/api/admin/backup/restore",
    });
  }
}
