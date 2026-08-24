import { loadEnvFiles } from "../lib/env/load-env";

loadEnvFiles();
import { DEFAULT_EXPENSE_TEMPLATES } from "../lib/constants";
import { getPrismaClient } from "../lib/db";
import { runApplicationBootstrap } from "../lib/server/bootstrap/pipeline";
import { PRODUCT_CATEGORY_DEFINITIONS } from "../lib/server/product-category-lookup";

const prisma = getPrismaClient();

async function main() {
  const bootstrapReport = await runApplicationBootstrap();

  if (!bootstrapReport.success) {
    throw new Error(
      `Bootstrap failed at stage "${bootstrapReport.failedStage}": ${bootstrapReport.error}`
    );
  }

  for (const template of DEFAULT_EXPENSE_TEMPLATES) {
    await prisma.expenseTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        category: template.category,
        defaultAmount: template.defaultAmount,
        active: template.active,
      },
      create: {
        id: template.id,
        name: template.name,
        category: template.category,
        defaultAmount: template.defaultAmount,
        active: template.active,
      },
    });
  }

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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
