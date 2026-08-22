import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma, verifyDatabaseConnection } from "@/lib/db";

function redactDatabaseUrl(connectionString: string | undefined): string | null {
  if (!connectionString?.trim()) {
    return null;
  }

  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return connectionString.replace(/:([^:@/]+)@/, ":***@");
  }
}

export async function GET() {
  const databaseUrl = redactDatabaseUrl(process.env.DATABASE_URL);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      connected: false,
      databaseUrl,
      branchCount: 0,
      userCount: 0,
      staffCount: 0,
      roleCount: 0,
      productCount: 0,
      saleCount: 0,
    });
  }

  try {
    await verifyDatabaseConnection();

    const [
      branchCount,
      userCount,
      staffCount,
      roleCount,
      productCount,
      saleCount,
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.user.count(),
      prisma.staff.count(),
      prisma.role.count(),
      prisma.product.count(),
      prisma.sale.count(),
    ]);

    return NextResponse.json({
      connected: true,
      databaseUrl,
      branchCount,
      userCount,
      staffCount,
      roleCount,
      productCount,
      saleCount,
    });
  } catch (error) {
    console.error("[debug/db] database check failed:", error);

    return NextResponse.json({
      connected: false,
      databaseUrl,
      branchCount: 0,
      userCount: 0,
      staffCount: 0,
      roleCount: 0,
      productCount: 0,
      saleCount: 0,
    });
  }
}
