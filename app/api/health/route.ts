import { isDatabaseConfigured, verifyDatabaseConnection } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();

  let databaseConnected = false;
  if (databaseConfigured) {
    try {
      await verifyDatabaseConnection();
      databaseConnected = true;
    } catch (error) {
      databaseConnected = false;
      console.error("[health] database check failed:", error);
    }
  }

  return jsonOk({
    status: "ok",
    databaseConfigured,
    databaseConnected,
    timestamp: new Date().toISOString(),
  });
}
