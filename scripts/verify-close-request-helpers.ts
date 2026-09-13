import type { Branch } from "@/types";

export const EMPTY_CLOSE_PAYLOAD = {
  metrics: {
    todaySales: 0,
    todayPurchases: 0,
    todayOperatingExpenses: 0,
    todayInventoryInvestment: 0,
    todayStaffPaymentsRecorded: 0,
    cashBeforeClosing: 0,
  },
  staffPayouts: [] as unknown[],
  expectedCash: 0,
  actualCashCounted: 0,
  cashDifference: 0,
  cashStatus: "balanced" as const,
  summary: {
    sales: 0,
    expenses: 0,
    inventoryInvestment: 0,
    staffPayments: 0,
    remainingCash: 0,
    inventoryFund: 0,
    operatingFund: 0,
  },
};

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
};

export async function submitCloseRequestApi<T = { status: string; date: string }>(
  client: JsonClient,
  branch: Branch | string,
  date: string,
  payload: typeof EMPTY_CLOSE_PAYLOAD = EMPTY_CLOSE_PAYLOAD
): Promise<T> {
  return client.json<T>("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      action: "submit-close-request",
      branch,
      date,
      ...payload,
    }),
  });
}

export async function approveCloseDayApi<T = { status: string; date: string; closedAt?: string }>(
  client: JsonClient,
  branch: Branch | string,
  date: string,
  payload: typeof EMPTY_CLOSE_PAYLOAD = EMPTY_CLOSE_PAYLOAD
): Promise<T> {
  return client.json<T>("/api/day-closings", {
    method: "POST",
    body: JSON.stringify({
      action: "approve-close",
      branch,
      date,
      ...payload,
    }),
  });
}

export async function submitAndApproveClose<T = { status: string; date: string; closedAt?: string }>(
  submitClient: JsonClient,
  approveClient: JsonClient,
  branch: Branch | string,
  date: string,
  payload: typeof EMPTY_CLOSE_PAYLOAD = EMPTY_CLOSE_PAYLOAD
): Promise<T> {
  await submitCloseRequestApi(submitClient, branch, date, payload);
  return approveCloseDayApi<T>(approveClient, branch, date, payload);
}
