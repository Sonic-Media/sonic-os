import { prisma } from "@/lib/db";
import { loginWithCredentials, VERIFY_OWNER_CREDENTIALS } from "./verify-session";

type JsonClient = {
  json: <T>(path: string, options?: RequestInit) => Promise<T>;
};

export interface CertificationCashier {
  username: string;
  password: string;
  staffId: string;
  userId: string;
}

export async function createCertificationCashier(
  owner: JsonClient,
  testPrefix: string,
  branch = "main",
  role: "cashier" | "branch-manager" = "cashier"
): Promise<CertificationCashier> {
  const password = `${testPrefix}-pw`;
  const username = `${testPrefix}-${role}`.slice(0, 48);

  const staff = await owner.json<{ id: string }>("/api/staff", {
    method: "POST",
    body: JSON.stringify({
      name: `${testPrefix} ${role}`,
      branch,
      role,
      status: "active",
      dailyWage: 10000,
    }),
  });

  const user = await owner.json<{ id: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      username,
      displayName: `${testPrefix} ${role}`,
      role,
      branch,
      password,
      staffId: staff.id,
    }),
  });

  return {
    username,
    password,
    staffId: staff.id,
    userId: user.id,
  };
}

export async function cleanupCertificationCashier(
  cashier: CertificationCashier,
  options?: { branch?: string; date?: string }
): Promise<void> {
  const branchCode = options?.branch ?? "main";
  const date = options?.date ?? new Date().toISOString().slice(0, 10);

  await prisma.auditLogEntry
    .deleteMany({
      where: {
        userId: cashier.staffId,
        action: {
          in: ["Start Shift", "Clock In", "Clock Out", "Open Shop"],
        },
      },
    })
    .catch(() => undefined);

  const branch = await prisma.branch.findFirst({
    where: { code: branchCode },
    select: { id: true },
  });

  if (branch) {
    await prisma.dayClosing
      .deleteMany({
        where: {
          branchId: branch.id,
          date,
          openedBy: cashier.userId,
          status: "open",
        },
      })
      .catch(() => undefined);
  }

  await prisma.session.deleteMany({ where: { userId: cashier.userId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: cashier.userId } }).catch(() => undefined);
  await prisma.staff.delete({ where: { id: cashier.staffId } }).catch(() => undefined);
}

export async function loginOwner(client: JsonClient): Promise<void> {
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);
}
