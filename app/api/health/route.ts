import { checkDatabaseConnection } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  const connection = await checkDatabaseConnection();

  return jsonOk({
    status: "ok",
    databaseConfigured: connection.diagnostics.configured,
    databaseConnected: connection.connected,
    databaseError: connection.error,
    timestamp: new Date().toISOString(),
  });
}
