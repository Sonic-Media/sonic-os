import type { Branch } from "@/types";

/** Future owner mode: `'all'` aggregates every branch. */
export type BranchScope = Branch | "all";

type ActiveBranchGetter = () => Branch | null;

let activeBranchGetter: ActiveBranchGetter = () => null;

export function registerActiveBranchGetter(getter: ActiveBranchGetter): void {
  activeBranchGetter = getter;
}

export function getActiveBranchCode(): Branch | null {
  return activeBranchGetter();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Inject `branch` into write payloads when the caller did not set one. */
export function mergeActiveBranchIntoBody(body: unknown): unknown {
  const branch = getActiveBranchCode();
  if (!branch || !isRecord(body)) {
    return body;
  }

  if (body.branch !== undefined && body.branch !== null && body.branch !== "") {
    return body;
  }

  return { ...body, branch };
}

/** Append `branch` query param for branch-scoped GET requests. */
export function appendBranchQuery(path: string, branch?: Branch | null): string {
  const code = branch ?? getActiveBranchCode();
  if (!code) {
    return path;
  }

  const url = new URL(path, "http://local");
  if (!url.searchParams.has("branch") && !url.searchParams.has("branchCode")) {
    url.searchParams.set("branch", code);
  }

  return `${url.pathname}${url.search}`;
}
