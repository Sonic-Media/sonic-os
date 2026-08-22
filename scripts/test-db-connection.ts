import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  console.log("DATABASE_URL set:", Boolean(process.env.DATABASE_URL));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("prisma $queryRaw ok:", result);
  } catch (error) {
    console.error("prisma $queryRaw failed:", error);
  }

  try {
    const count = await prisma.sale.count();
    console.log("prisma sale.count ok:", count);
  } catch (error) {
    console.error("prisma sale.count failed:", error);
  }

  await prisma.$disconnect();
  await pool.end();
}

void main();
