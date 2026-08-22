import { ApiError } from "@/lib/api/errors";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { normalizeSettings } from "@/lib/settings-storage";
import type { AppSettings } from "@/types";

function mapAppSettings(record: {
  businessName: string;
  ownerName: string;
  branchNames: unknown;
  defaultLunchAmount: number;
}): AppSettings {
  return normalizeSettings({
    businessName: record.businessName,
    ownerName: record.ownerName,
    branchNames: record.branchNames,
    defaultLunchAmount: record.defaultLunchAmount,
  });
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = await prisma.appSetting.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    return DEFAULT_APP_SETTINGS;
  }

  return mapAppSettings(settings);
}

export async function updateAppSettings(
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = normalizeSettings({ ...current, ...patch });

  const settings = await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      businessName: next.businessName,
      ownerName: next.ownerName,
      branchNames: next.branchNames,
      defaultLunchAmount: next.defaultLunchAmount,
    },
    create: {
      id: "default",
      businessName: next.businessName,
      ownerName: next.ownerName,
      branchNames: next.branchNames,
      defaultLunchAmount: next.defaultLunchAmount,
    },
  });

  return mapAppSettings(settings);
}
