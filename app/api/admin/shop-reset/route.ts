import { jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  previewBranchShopReset,
  runBranchShopReset,
} from "@/lib/server/branch-shop-reset-service";

export const maxDuration = 120;

function logShopResetRouteError(method: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      event: "shop_reset.route.error",
      timestamp: new Date().toISOString(),
      method,
      pathname: "/api/admin/shop-reset",
      errorName: err.name,
      errorMessage: err.message,
    })
  );
}

export async function GET(request: Request) {
  try {
    const scope = new URL(request.url).searchParams.get("scope") ?? "main";
    const preview = await withDatabase(() => previewBranchShopReset(scope), {
      request,
      ownerOnly: true,
    });
    return jsonOk(preview);
  } catch (error) {
    logShopResetRouteError("GET", error);
    return handleRouteError(error, {
      method: "GET",
      pathname: "/api/admin/shop-reset",
    });
  }
}

export async function POST(request: Request) {
  try {
    const report = await withDatabase(
      async () => {
        const body = await request.json();
        return runBranchShopReset({
          scope: body?.scope ?? "main",
          confirmation: body?.confirmation ?? "",
        });
      },
      { request, ownerOnly: true }
    );

    return jsonOk(report);
  } catch (error) {
    logShopResetRouteError("POST", error);
    return handleRouteError(error, {
      method: "POST",
      pathname: "/api/admin/shop-reset",
    });
  }
}
