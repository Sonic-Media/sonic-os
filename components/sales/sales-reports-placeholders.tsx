import { Card } from "@/components/shared/ui/card";

const REPORT_PLACEHOLDERS = [
  {
    title: "Daily Accessory Sales",
    description: "Track revenue and transactions by day.",
  },
  {
    title: "Weekly Accessory Sales",
    description: "Compare weekly accessory sales performance over time.",
  },
  {
    title: "Monthly Accessory Sales",
    description: "View monthly accessory revenue and profit trends.",
  },
  {
    title: "Top Selling Items",
    description: "See which products drive the most volume.",
  },
  {
    title: "Most Profitable Items",
    description: "Identify items with the highest margins.",
  },
  {
    title: "Payment Breakdown",
    description: "Analyze accessory sales by payment method.",
  },
];

export function SalesReportsPlaceholders() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {REPORT_PLACEHOLDERS.map((report) => (
        <Card
          key={report.title}
          className="flex min-h-[180px] flex-col justify-between border-dashed border-zinc-700/80 bg-zinc-900/30"
        >
          <div>
            <h3 className="text-sm font-medium text-white">{report.title}</h3>
            <p className="mt-2 text-xs text-zinc-500">{report.description}</p>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-600">
            Coming Soon
          </p>
        </Card>
      ))}
    </section>
  );
}
