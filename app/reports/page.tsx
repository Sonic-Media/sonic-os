"use client";

import { ReportsWorkspace } from "@/components/reports/reports-workspace";

// ReportsBranchFilter + canSelectBranch and ReportsDatePicker when period === "daily"
// are rendered via ReportsFilterToolbar inside ReportsWorkspace.

export default function ReportsPage() {
  return <ReportsWorkspace />;
}
