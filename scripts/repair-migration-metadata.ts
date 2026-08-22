import "dotenv/config";
import { prisma } from "@/lib/db";

async function main() {
  await prisma.$executeRaw`
    UPDATE "_prisma_migrations"
    SET finished_at = started_at,
        logs = COALESCE(logs, '')
    WHERE migration_name = '20260802100000_init'
      AND finished_at IS NULL
  `;

  const existing = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE migration_name = '20260802180000_postgres_migration_complete'
  `;

  if (Number(existing[0]?.count ?? 0) === 0) {
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        id,
        checksum,
        finished_at,
        migration_name,
        logs,
        rolled_back_at,
        started_at,
        applied_steps_count
      )
      VALUES (
        gen_random_uuid(),
        'manual',
        NOW(),
        '20260802180000_postgres_migration_complete',
        '',
        NULL,
        NOW(),
        1
      )
    `;
  }

  const rows = await prisma.$queryRaw<
    { migration_name: string; finished: boolean }[]
  >`
    SELECT migration_name, finished_at IS NOT NULL AS finished
    FROM "_prisma_migrations"
    ORDER BY started_at
  `;

  console.info(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
