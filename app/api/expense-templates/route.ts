import { jsonCreated, jsonOk } from "@/lib/api/response";
import { handleRouteError, withDatabase } from "@/lib/server/route-handler";
import {
  createExpenseTemplate,
  deleteExpenseTemplate,
  listExpenseTemplates,
  updateExpenseTemplate,
} from "@/lib/server/services/expense-templates-service";

export async function GET(request: Request) {
  try {
    const templates = await withDatabase(() => listExpenseTemplates(), {
      request,
    });
    return jsonOk(templates);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const template = await withDatabase(() => createExpenseTemplate(body), {
      request,
      module: "operations",
    });
    return jsonCreated(template);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...patch } = body as { id?: string };

    if (!id) {
      throw new Error("Template id is required.");
    }

    const template = await withDatabase(
      () => updateExpenseTemplate(id, patch),
      { request, module: "operations" }
    );
    return jsonOk(template);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw new Error("Template id is required.");
    }

    await withDatabase(() => deleteExpenseTemplate(id), {
      request,
      module: "operations",
    });
    return jsonOk({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
