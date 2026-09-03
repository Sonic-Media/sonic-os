export type BIInsightCategory =
  | "revenue"
  | "stock"
  | "sales"
  | "expenses"
  | "staff"
  | "branches"
  | "warning"
  | "recommendation";

/** Display severity — maps to dashboard icons. */
export type BIInsightSeverity = "critical" | "warning" | "positive" | "info";

/** Sort tier: critical warnings first, then recommendations, then achievements. */
export type BIInsightTier = "critical" | "recommendation" | "achievement" | "info";

export interface BIInsight {
  id: string;
  text: string;
  severity: BIInsightSeverity;
  tier: BIInsightTier;
  category: BIInsightCategory;
  priority: number;
}

export interface BIFeed {
  insights: BIInsight[];
  generatedAt: string;
}

export const BI_TIER_ORDER: Record<BIInsightTier, number> = {
  critical: 0,
  recommendation: 1,
  achievement: 2,
  info: 3,
};

export const BI_SEVERITY_EMOJI: Record<BIInsightSeverity, string> = {
  critical: "🔴",
  warning: "🟡",
  positive: "🟢",
  info: "ℹ️",
};
