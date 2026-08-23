"use client";

import {
  StaffCollapsibleCard,
  type StaffCardAccent,
} from "@/components/operations/staff/primitives";
import type { ReactNode } from "react";

interface StaffOperationCardProps {
  title: string;
  description?: string;
  collapsedPreview?: ReactNode;
  children?: ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  collapsible?: boolean;
  accent?: StaffCardAccent;
  className?: string;
  headerAction?: ReactNode;
}

export function StaffOperationCard(props: StaffOperationCardProps) {
  return <StaffCollapsibleCard {...props} />;
}
