import { z } from "zod";

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Request body must be valid JSON.",
        path: [],
      },
    ]);
  }

  return schema.parse(body);
}

export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>
): T {
  const values = Object.fromEntries(searchParams.entries());
  return schema.parse(values);
}
