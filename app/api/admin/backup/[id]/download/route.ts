import { ApiError } from "@/lib/api/errors";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { downloadBackupById } from "@/lib/server/backup/restore-service";
import { requireSession } from "@/lib/server/session";
import { requireOwner } from "@/lib/server/security/authorization";

export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const file = await withDatabase(
      async () => {
        const session = await requireSession();
        requireOwner(session);
        return downloadBackupById(id);
      },
      { ownerOnly: true }
    );

    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return handleRouteError(error, {
        method: "GET",
        pathname: "/api/admin/backup/[id]/download",
      });
    }
    return handleRouteError(error, {
      method: "GET",
      pathname: "/api/admin/backup/[id]/download",
    });
  }
}
