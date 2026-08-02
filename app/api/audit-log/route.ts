import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const records = await withDatabase(async () => {
      return prisma.authAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
    }, { ownerOnly: true });

    return jsonOk(records);
  } catch (error) {
    return handleRouteError(error, {
      method: "GET",
      pathname: "/api/audit-log",
    });
  }
}
