import "dotenv/config";
import { prisma } from "@/lib/db";
import { runApplicationBootstrap } from "@/lib/server/bootstrap/pipeline";

async function main() {
  const report = await runApplicationBootstrap();

  console.log(JSON.stringify(report, null, 2));

  if (!report.success) {
    process.exitCode = 1;
    return;
  }

  const [users, staff, categories, branches] = await Promise.all([
    prisma.user.count(),
    prisma.staff.count(),
    prisma.expenseCategory.count(),
    prisma.branch.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        users,
        staff,
        categories,
        branches,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
