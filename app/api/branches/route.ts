import { jsonCreated, jsonError, jsonOk } from "@/lib/api/response";
import {
  createBranch,
  listBranches,
} from "@/lib/server/services/branches-service";
import { requireSession } from "@/lib/server/session";
import { isDatabaseConfigured } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      throw new ApiError("Database is not configured.", {
        status: 503,
        code: "database_unavailable",
      });
    }

    await requireSession();
    const branches = await listBranches();
    return jsonOk(branches);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      throw new ApiError("Database is not configured.", {
        status: 503,
        code: "database_unavailable",
      });
    }

    await requireSession();
    const body = await request.json();
    const branch = await createBranch(body);
    return jsonCreated(branch);
  } catch (error) {
    return jsonError(error);
  }
}
