import { PriorityTier } from "@prisma/client";

export interface PriorityFactors {
  severityScore: number;       // 0 – 100
  affectedPeopleScore: number; // 0 – 100
  frequencyScore: number;      // 0 – 100
  evidenceScore: number;       // 0 – 100
  urgencyScore: number;        // 0 – 100
}

/**
 * Calculates the single Priority Score and maps it to the strictly defined 3 tiers.
 *
 * Exact Approved Formula:
 *   Priority Score = (Severity × 0.25) + (Affected People × 0.25) + (Frequency × 0.15) + (Evidence × 0.15) + (Urgency × 0.20)
 *
 * Tiers:
 *   HIGH:   70.0 – 100.0
 *   MEDIUM: 40.0 – 69.9
 *   LOW:    0.0  – 39.9
 */
export function calculatePriority(factors: PriorityFactors): {
  priorityScore: number;
  priorityTier: PriorityTier;
} {
  // Clamp all factors between 0 and 100
  const clamp = (val: number) => Math.max(0, Math.min(100, val));

  const s = clamp(factors.severityScore);
  const a = clamp(factors.affectedPeopleScore);
  const f = clamp(factors.frequencyScore);
  const e = clamp(factors.evidenceScore);
  const u = clamp(factors.urgencyScore);

  const rawScore = s * 0.25 + a * 0.25 + f * 0.15 + e * 0.15 + u * 0.2;

  // Round to 2 decimal places
  const priorityScore = Math.round(rawScore * 100) / 100;

  let priorityTier: PriorityTier = PriorityTier.LOW;
  if (priorityScore >= 70.0) {
    priorityTier = PriorityTier.HIGH;
  } else if (priorityScore >= 40.0) {
    priorityTier = PriorityTier.MEDIUM;
  }

  return { priorityScore, priorityTier };
}
