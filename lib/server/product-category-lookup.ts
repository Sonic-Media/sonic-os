import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";

export const PRODUCT_CATEGORY_DEFINITIONS = [
  { slug: "flash-disks", name: "Flash Disks" },
  { slug: "hard-drives", name: "Hard Drives" },
  { slug: "usb-cables", name: "USB Cables" },
  { slug: "chargers", name: "Chargers" },
  { slug: "earphones", name: "Earphones" },
  { slug: "bluetooth-speakers", name: "Bluetooth Speakers" },
  { slug: "hdmi-cables", name: "HDMI Cables" },
  { slug: "game-controllers", name: "Game Controllers" },
  { slug: "phone-accessories", name: "Phone Accessories" },
  { slug: "computer-accessories", name: "Computer Accessories" },
  { slug: "networking-equipment", name: "Networking Equipment" },
  { slug: "other-accessories", name: "Other Accessories" },
] as const;

const categorySlugToId = new Map<string, string>();

export async function getCategoryIdBySlug(slug: string): Promise<string> {
  const normalized = slug.trim().toLowerCase();
  const cached = categorySlugToId.get(normalized);
  if (cached) return cached;

  const category = await prisma.productCategory.findUnique({
    where: { slug: normalized },
  });

  if (!category) {
    throw new ApiError(`Product category not found: ${slug}`, {
      status: 404,
      code: "category_not_found",
    });
  }

  categorySlugToId.set(normalized, category.id);
  return category.id;
}

export function clearProductCategoryLookupCache() {
  categorySlugToId.clear();
}

export async function ensureProductCategoriesSeeded(): Promise<void> {
  for (const category of PRODUCT_CATEGORY_DEFINITIONS) {
    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        active: true,
      },
      create: {
        slug: category.slug,
        name: category.name,
        active: true,
      },
    });
  }
}
