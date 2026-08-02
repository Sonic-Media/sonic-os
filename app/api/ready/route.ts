import { jsonOk } from "@/lib/api/response";
import {
  getReadinessReport,
  isReadinessReportReady,
} from "@/lib/server/readiness";
import { NextResponse } from "next/server";

export async function GET() {
  const report = await getReadinessReport();

  if (!isReadinessReportReady(report)) {
    return NextResponse.json({ data: report }, { status: 503 });
  }

  return jsonOk(report);
}
