import { generateBranchInsights } from "@/lib/business-intelligence/generators/branches";
import { generateExpenseInsights } from "@/lib/business-intelligence/generators/expenses";
import { generateInventoryInsights } from "@/lib/business-intelligence/generators/inventory";
import { generateRecommendationInsights } from "@/lib/business-intelligence/generators/recommendations";
import { generateRevenueInsights } from "@/lib/business-intelligence/generators/revenue";
import { generateSalesInsights } from "@/lib/business-intelligence/generators/sales";
import { generateStaffInsights } from "@/lib/business-intelligence/generators/staff";
import { generateWarningInsights } from "@/lib/business-intelligence/generators/warnings";
import type { BIAnalysisContext } from "@/lib/business-intelligence/context";
import {
  BI_TIER_ORDER,
  type BIFeed,
  type BIInsight,
} from "@/lib/business-intelligence/types";

const MIN_INSIGHTS = 3;
const MAX_INSIGHTS = 6;

function sortInsights(insights: BIInsight[]): BIInsight[] {
  return [...insights].sort((left, right) => {
    const tierDiff = BI_TIER_ORDER[left.tier] - BI_TIER_ORDER[right.tier];
    if (tierDiff !== 0) return tierDiff;
    return right.priority - left.priority;
  });
}

function dedupeInsights(insights: BIInsight[]): BIInsight[] {
  const seenTexts = new Set<string>();
  const result: BIInsight[] = [];

  for (const insight of insights) {
    const normalized = insight.text.trim().toLowerCase();
    if (seenTexts.has(normalized)) continue;
    seenTexts.add(normalized);
    result.push(insight);
  }

  return result;
}

export function generateBusinessIntelligenceFeed(
  context: BIAnalysisContext
): BIFeed {
  const candidates = [
    ...generateWarningInsights(context),
    ...generateRevenueInsights(context),
    ...generateInventoryInsights(context),
    ...generateSalesInsights(context),
    ...generateExpenseInsights(context),
    ...generateStaffInsights(context),
    ...generateBranchInsights(context),
    ...generateRecommendationInsights(context),
  ];

  const sorted = sortInsights(dedupeInsights(candidates));
  let insights = sorted.slice(0, MAX_INSIGHTS);

  if (insights.length < MIN_INSIGHTS) {
    const fallback: BIInsight = {
      id: "bi-steady-state",
      text: "Business activity is flowing normally — insights will sharpen as more data is recorded today.",
      severity: "info",
      tier: "info",
      category: "revenue",
      priority: 1,
    };
    insights = [...insights, fallback].slice(0, MAX_INSIGHTS);
  }

  return {
    insights,
    generatedAt: new Date(context.nowMs).toISOString(),
  };
}

export {
  generateBranchInsights,
  generateExpenseInsights,
  generateInventoryInsights,
  generateRecommendationInsights,
  generateRevenueInsights,
  generateSalesInsights,
  generateStaffInsights,
  generateWarningInsights,
};
