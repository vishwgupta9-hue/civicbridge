import { FilterStatus, PriorityTier } from "@prisma/client";

export interface AIAnalysisResult {
  filterStatus: FilterStatus;
  filterReason: string;
  confidenceScore: number;
  predictedCategory: string;
  predictedSubCategory?: string | null;
  aiSummary: string;
  severityScore: number;        // 0 – 100
  affectedPeopleScore: number;  // 0 – 100
  frequencyScore: number;       // 0 – 100
  evidenceScore: number;        // 0 – 100
  urgencyScore: number;         // 0 – 100
  aiUrgencyScore: number;       // 1 – 10 (raw LLM signal)
  aiUrgencyReason: string;
  priorityScore: number;        // (S*0.25)+(A*0.25)+(F*0.15)+(E*0.15)+(U*0.20)
  priorityTier: PriorityTier;   // HIGH (70-100) | MEDIUM (40-69.9) | LOW (0-39.9)
  isDuplicate: boolean;
  duplicateSimilarity: number | null;
  similarProblemIds: string[];
}
