import assert from "node:assert/strict";
import {
  appendServiceSaleToNotes,
  createServiceSaleRecord,
  encodeNotesWithServiceSales,
  parseServiceSalesFromNotes,
  sumServiceSales,
  sumServiceSalesByCategory,
} from "@/lib/staff-home/service-sales";
import { computeStaffHomeRevenue } from "@/lib/staff-home/revenue";

function main() {
  const sale = createServiceSaleRecord({
    category: "printing",
    amount: 25_000,
    description: "20 pages",
    staffName: "Tony",
    now: new Date("2026-09-18T10:24:00"),
  });

  const notes = appendServiceSaleToNotes("Keep change float", sale);
  const parsed = parseServiceSalesFromNotes(notes);
  assert.equal(parsed.freeText, "Keep change float");
  assert.equal(parsed.sales.length, 1);
  assert.equal(parsed.sales[0]?.amount, 25_000);
  assert.equal(parsed.sales[0]?.category, "printing");

  const windows = createServiceSaleRecord({
    category: "windows",
    amount: 40_000,
    now: new Date("2026-09-18T09:16:00"),
  });
  const combined = appendServiceSaleToNotes(notes, windows);
  const totals = sumServiceSalesByCategory(
    parseServiceSalesFromNotes(combined).sales
  );
  assert.equal(totals.printing, 25_000);
  assert.equal(totals.windows, 40_000);
  assert.equal(sumServiceSales(parseServiceSalesFromNotes(combined).sales), 65_000);

  const empty = encodeNotesWithServiceSales("hello", []);
  assert.equal(empty, "hello");

  const revenue = computeStaffHomeRevenue({
    branch: "main",
    date: "2026-09-18",
    movieRevenue: 120_000,
    sales: [
      {
        id: "s1",
        invoiceNumber: "INV",
        date: "2026-09-18",
        time: "10:00 AM",
        items: [],
        subtotal: 85_000,
        discount: 0,
        total: 85_000,
        profit: 20_000,
        paymentMethod: "cash",
        branch: "main",
        status: "completed",
        createdAt: "2026-09-18T10:00:00.000Z",
      },
    ],
    entryNotes: combined,
  });

  assert.equal(revenue.movies, 120_000);
  assert.equal(revenue.accessories, 85_000);
  assert.equal(revenue.printing, 25_000);
  assert.equal(revenue.windows, 40_000);
  assert.equal(revenue.total, 270_000);

  console.log("PASS staff-home service sales + revenue helpers");
}

main();
