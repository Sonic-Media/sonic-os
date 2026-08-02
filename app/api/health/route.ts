import { isDatabaseConfigured, prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();

  let databaseConnected = false;
  if (databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }
  }

  return jsonOk({
    status: "ok",
    databaseConfigured,
    databaseConnected,
    timestamp: new Date().toISOString(),
  });
}
