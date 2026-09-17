/**
 * Live API restore e2e — local disposable Postgres only.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";

class ApiClient {
  cookieHeader = "";

  async json<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);

    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookieHeader = setCookie
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter(Boolean)
        .join("; ");
    }

    const payload = (await response.json()) as {
      data?: T;
      error?: { message?: string; code?: string };
    };

    if (!response.ok) {
      throw new Error(
        `${path} failed (${response.status}): ${JSON.stringify(payload.error ?? payload)}`
      );
    }

    return payload.data as T;
  }

  async download(path: string): Promise<{ ok: boolean; status: number; bytes: number }> {
    const headers = new Headers();
    if (this.cookieHeader) headers.set("Cookie", this.cookieHeader);
    const response = await fetch(`${BASE_URL}${path}`, { headers });
    const buffer = Buffer.from(await response.arrayBuffer());
    return { ok: response.ok, status: response.status, bytes: buffer.length };
  }
}

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("Live backup restore e2e\n");

  const client = new ApiClient();
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);

  const before = await client.json<Array<{ id: string; trigger: string; status: string; format: string }>>(
    "/api/admin/backup"
  );

  const created = await client.json<{
    id: string;
    status: string;
    format: string;
    fileSizeBytes: number | null;
  }>("/api/admin/backup", {
    method: "POST",
    body: JSON.stringify({}),
  });

  recordCheck(
    "Backup Now creates a completed JSON backup",
    created.status === "completed" && created.format === "json",
    `${created.format}/${created.status}`
  );

  const download = await client.download(
    `/api/admin/backup/${created.id}/download`
  );
  recordCheck(
    "Download returns backup bytes",
    download.ok && download.bytes > 0,
    `status=${download.status} bytes=${download.bytes}`
  );

  const restored = await client.json<{
    safetyBackup: { id: string; trigger: string; status: string };
    restoreRecord: { id: string; trigger: string; status: string };
    restoredRows: number;
  }>("/api/admin/backup/restore", {
    method: "POST",
    body: JSON.stringify({ backupId: created.id }),
  });

  recordCheck(
    "Restore creates Pre-Restore Safety Backup",
    restored.safetyBackup.trigger === "pre-restore" &&
      restored.safetyBackup.status === "completed",
    restored.safetyBackup.trigger
  );

  recordCheck(
    "Restore records a separate Restore history entry",
    restored.restoreRecord.trigger === "restore" &&
      restored.restoreRecord.status === "completed",
    restored.restoreRecord.trigger
  );

  recordCheck(
    "Restore applied rows",
    restored.restoredRows > 0,
    `rows=${restored.restoredRows}`
  );

  const after = await client.json<
    Array<{ id: string; trigger: string; status: string }>
  >("/api/admin/backup");

  recordCheck(
    "Backup history retained after restore",
    after.length >= before.length + 2,
    `before=${before.length} after=${after.length}`
  );

  recordCheck(
    "Original backup still listed",
    after.some((item) => item.id === created.id),
    created.id.slice(0, 8)
  );

  // Invalid file must not wipe data
  const badForm = new FormData();
  badForm.append(
    "file",
    new Blob(["not-a-backup"], { type: "application/json" }),
    "bad.json"
  );

  let invalidRejected = false;
  try {
    await client.json("/api/admin/backup/restore", {
      method: "POST",
      body: badForm,
    });
  } catch (error) {
    invalidRejected = /invalid|not a valid|missing/i.test(
      error instanceof Error ? error.message : String(error)
    );
  }
  recordCheck("Invalid upload rejected without restore", invalidRejected);

  console.log("\nLive backup restore e2e complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
