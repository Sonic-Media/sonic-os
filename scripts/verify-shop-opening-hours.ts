#!/usr/bin/env tsx
/**
 * Expected shop opening hours UX verification (display-only schedule).
 */
import assert from "node:assert/strict";
import {
  SHOP_OPEN_HOUR,
  getOpeningHoursLabel,
  getShopScheduleState,
} from "@/lib/operations/opening-hours";

function recordCheck(label: string, pass: boolean, detail?: string) {
  assert.ok(pass, detail ? `${label}: ${detail}` : label);
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function main(): void {
  console.log("Shop expected opening hours verification\n");

  recordCheck("SHOP_OPEN_HOUR is 7", SHOP_OPEN_HOUR === 7, `hour=${SHOP_OPEN_HOUR}`);

  recordCheck(
    "Opening window label",
    getOpeningHoursLabel() === "7:00 AM – 11:00 PM",
    getOpeningHoursLabel()
  );

  const beforeOpen = new Date("2026-09-15T05:30:00");
  const beforeState = getShopScheduleState(beforeOpen);
  recordCheck(
    "Before-open status message",
    beforeState.statusMessage === "Opening begins at 7:00 AM.",
    beforeState.statusMessage
  );
  recordCheck(
    "Before-open countdown targets 7:00 AM",
    beforeState.targetTime.getHours() === 7 && beforeState.targetTime.getMinutes() === 0,
    beforeState.targetTime.toString()
  );
  recordCheck(
    "Before-open detail window",
    beforeState.detailMessage === "7:00 AM – 11:00 PM",
    beforeState.detailMessage
  );

  const afterClose = new Date("2026-09-15T23:30:00");
  const afterState = getShopScheduleState(afterClose);
  recordCheck(
    "After-close next opening message",
    afterState.detailMessage === "Next opening at 7:00 AM.",
    afterState.detailMessage
  );
  recordCheck(
    "After-close countdown targets next-day 7:00 AM",
    afterState.targetTime.getHours() === 7 &&
      afterState.targetTime.getTime() > afterClose.getTime(),
    afterState.targetTime.toString()
  );

  console.log("\nShop expected opening hours verification complete.");
}

main();
