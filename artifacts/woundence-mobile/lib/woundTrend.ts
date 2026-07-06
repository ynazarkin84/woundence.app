import type { WoundAssessment } from "@/lib/api";

export type HealingTrend = "improving" | "stable" | "worsening" | null;

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

function getArea(assessment: WoundAssessment): number | null {
  const area = toNumber(assessment.area);
  if (area != null) return area;
  const length = toNumber(assessment.length);
  const width = toNumber(assessment.width);
  if (length != null && width != null) return length * width;
  return null;
}

/**
 * Derives a healing trend for one assessment by comparing its wound area to
 * the assessment immediately before it (chronologically) for the *same*
 * wound. There's no trend field in the data model — this is a client-side
 * heuristic, not a clinical judgment. Returns null when there's no prior
 * assessment for this wound to compare against, or when area can't be
 * determined for either one.
 *
 * `allAssessments` should be every assessment for the patient (or wound) the
 * `current` one belongs to, in any order — this function does its own
 * filtering and sorting.
 */
export function computeHealingTrend(
  allAssessments: WoundAssessment[],
  current: WoundAssessment
): HealingTrend {
  if (!current.woundId) return null;

  const sameWound = allAssessments
    .filter((a) => a.woundId === current.woundId && a.assessmentDate)
    .sort((a, b) => new Date(a.assessmentDate!).getTime() - new Date(b.assessmentDate!).getTime());

  const index = sameWound.findIndex((a) => a.id === current.id);
  if (index <= 0) return null;

  const currentArea = getArea(current);
  const previousArea = getArea(sameWound[index - 1]);
  if (currentArea == null || previousArea == null || previousArea === 0) return null;

  const percentChange = (currentArea - previousArea) / previousArea;
  if (percentChange <= -0.1) return "improving";
  if (percentChange >= 0.1) return "worsening";
  return "stable";
}

export const HEALING_TREND_LABELS: Record<Exclude<HealingTrend, null>, string> = {
  improving: "Improving",
  stable: "Stable",
  worsening: "Worsening",
};
