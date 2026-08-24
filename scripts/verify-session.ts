export const VERIFY_OWNER_CREDENTIALS = {
  username: "owner",
  password: "owner",
} as const;

export const VERIFY_STAFF_CREDENTIALS = {
  username: process.env.VERIFY_STAFF_USERNAME ?? "tony",
  password: process.env.VERIFY_STAFF_PASSWORD ?? "tony",
} as const;

export const VERIFY_MANAGER_CREDENTIALS = {
  username: process.env.VERIFY_MANAGER_USERNAME ?? "penny",
  password: process.env.VERIFY_MANAGER_PASSWORD ?? "penny",
} as const;

type SessionClient = {
  json: (path: string, options?: RequestInit) => Promise<unknown>;
};

export async function loginWithCredentials(
  client: SessionClient,
  credentials: { username: string; password: string }
): Promise<void> {
  await client.json("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      username: credentials.username,
      password: credentials.password,
    }),
  });
}

type DayClosingRecord = {
  branch: string;
  date: string;
  status: string;
  openedAt?: string;
  reopenedAt?: string;
};

export async function ensureDayOpen(
  client: SessionClient,
  date: string,
  branch = "main",
  reopenClient?: SessionClient
): Promise<void> {
  const closings = (await client.json("/api/day-closings")) as DayClosingRecord[];
  const record = closings.find(
    (entry) => entry.branch === branch && entry.date === date
  );

  if (record?.status === "closed") {
    await (reopenClient ?? client).json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "reopen",
        branch,
        date,
      }),
    });
  }

  const refreshed = (await client.json("/api/day-closings")) as DayClosingRecord[];
  const openRecord = refreshed.find(
    (entry) => entry.branch === branch && entry.date === date
  );
  const isOpened =
    openRecord?.status === "open" &&
    !!(openRecord.openedAt || openRecord.reopenedAt);

  if (!isOpened) {
    await client.json("/api/day-closings", {
      method: "POST",
      body: JSON.stringify({
        action: "open",
        branch,
        date,
      }),
    });
  }
}
