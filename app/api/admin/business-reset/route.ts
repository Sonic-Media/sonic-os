import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  previewBusinessDataReset,
  resetBusinessData,
} from "@/lib/server/business-data-reset";

export const maxDuration = 60;

function logBusinessResetRouteError(method: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      event: "business_reset.route.error",
      timestamp: new Date().toISOString(),
      method,
      pathname: "/api/admin/business-reset",
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    })
  );
}

export async function GET() {
  try {
    const preview = await withDatabase(() => previewBusinessDataReset(), {
      ownerOnly: true,
    });
    return jsonOk(preview);
  } catch (error) {
    logBusinessResetRouteError("GET", error);
    return handleRouteError(error, {
      method: "GET",
      pathname: "/api/admin/business-reset",
    });
  }
}

export async function POST(request: Request) {
  try {
    const report = await withDatabase(
      async () => {
        const body = await request.json();
        return resetBusinessData(body);
      },
      { request, ownerOnly: true }
    );

    return jsonOk(report);
  } catch (error) {
    logBusinessResetRouteError("POST", error);
    return handleRouteError(error, {
      method: "POST",
      pathname: "/api/admin/business-reset",
    });
  }
}
