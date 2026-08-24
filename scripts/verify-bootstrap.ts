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
  branch = "main"
): Promise<CertificationCashier> {
  const password = `${testPrefix}-pw`;
  const username = `${testPrefix}-cashier`.slice(0, 48);

  const staff = await owner.json<{ id: string }>("/api/staff", {
    method: "POST",
    body: JSON.stringify({
      name: `${testPrefix} Cashier`,
      branch,
      role: "cashier",
      status: "active",
      dailyWage: 10000,
    }),
  });

  const user = await owner.json<{ id: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      username,
      displayName: `${testPrefix} Cashier`,
      role: "cashier",
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
  cashier: CertificationCashier
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId: cashier.userId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: cashier.userId } }).catch(() => undefined);
  await prisma.staff.delete({ where: { id: cashier.staffId } }).catch(() => undefined);
}

export async function loginOwner(client: JsonClient): Promise<void> {
  await loginWithCredentials(client, VERIFY_OWNER_CREDENTIALS);
}
