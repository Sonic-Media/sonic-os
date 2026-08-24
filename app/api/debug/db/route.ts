import { NextResponse } from "next/server";
import {
  checkDatabaseConnection,
  getDatabaseUrlDiagnostics,
  isDatabaseConfigured,
  prisma,
} from "@/lib/db";

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
  const diagnostics = getDatabaseUrlDiagnostics();

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      connected: false,
      databaseUrl,
      diagnostics,
      connectionError: "DATABASE_URL is not configured.",
      branchCount: 0,
      userCount: 0,
      staffCount: 0,
      roleCount: 0,
      productCount: 0,
      saleCount: 0,
    });
  }

  const connection = await checkDatabaseConnection();

  if (!connection.connected) {
    return NextResponse.json({
      connected: false,
      databaseUrl,
      diagnostics: connection.diagnostics,
      connectionError: connection.error,
      branchCount: 0,
      userCount: 0,
      staffCount: 0,
      roleCount: 0,
      productCount: 0,
      saleCount: 0,
    });
  }

  try {
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
      diagnostics: connection.diagnostics,
      connectionError: null,
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
      diagnostics: connection.diagnostics,
      connectionError:
        error instanceof Error ? error.message : "Database query failed.",
      branchCount: 0,
      userCount: 0,
      staffCount: 0,
      roleCount: 0,
      productCount: 0,
      saleCount: 0,
    });
  }
}
