import { GoogleGenAI } from "@google/genai";
import { FilterStatus } from "@prisma/client";
import { z } from "zod";
import { config } from "../../config/index.js";
import { AIAnalysisResult } from "./ai.types.js";
import { calculatePriority } from "./priority.calculator.js";
import { MockAIService } from "./mock.ai.service.js";

const mockService = new MockAIService();

/**
 * Strict Zod schema for validating Gemini LLM JSON response.
 * Protects against malformed LLM outputs, missing fields, or hallucinated types.
 */
export const GeminiOutputSchema = z.object({
  filterStatus: z.enum(["PASSED", "REJECTED", "FLAGGED"]),
  filterReason: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  predictedCategory: z.string().min(1),
  predictedSubCategory: z.string().nullable().optional(),
  aiSummary: z.string().min(1),
  severityScore: z.number().int().min(0).max(100),
  affectedPeopleScore: z.number().int().min(0).max(100),
  frequencyScore: z.number().int().min(0).max(100),
  evidenceScore: z.number().int().min(0).max(100),
  urgencyScore: z.number().int().min(0).max(100),
  aiUrgencyScore: z.number().int().min(1).max(10),
  aiUrgencyReason: z.string().min(1),
  rootCauseHypotheses: z.array(z.string()).default([]),
  requiredExpertise: z.array(z.string()).default([]),
  departmentHints: z.array(z.string()).default([]),
});

export type GeminiOutput = z.infer<typeof GeminiOutputSchema>;

/**
 * Gemini AI Service for CivicBridge.
 * Uses Google Gemini API when configured, with strict Zod validation
 * and resilient heuristic fallback to MockAIService.
 */
export class GeminiAIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.geminiApiKey && !config.mockAi) {
      try {
        this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err) {
        console.warn("⚠️ Failed to initialize GoogleGenAI client, using heuristic fallback.", err);
        this.ai = null;
      }
    }
  }

  public async analyze(problem: {
    title: string;
    description: string;
    category: string;
    subCategory?: string | null;
    district: string;
    affectedCount?: number | null;
    evidenceUrl?: string | null;
  }): Promise<
    Omit<
      AIAnalysisResult,
      "isDuplicate" | "duplicateSimilarity" | "similarProblemIds" | "duplicateStatus" | "duplicateCandidateTitle"
    >
  > {
    // If not configured or MOCK_AI is enabled, immediately use deterministic mock
    if (!this.ai || config.mockAi) {
      return mockService.analyze(problem);
    }

    try {
      const prompt = `
You are an expert civic problem evaluator for CivicBridge, a platform in Jharkhand, India.
Analyze the following civic problem report and output strictly valid JSON according to this specification:

Report:
- Title: ${problem.title}
- Description: ${problem.description}
- Category: ${problem.category}
- District: ${problem.district}
- Affected People Count: ${problem.affectedCount || 1}
- Has Evidence URL: ${problem.evidenceUrl ? "Yes" : "No"}

Rules:
1. filterStatus: Must be "PASSED", "REJECTED", or "FLAGGED".
   - REJECTED only for blatant promotional spam, commercial marketing, or automated gibberish.
   - FLAGGED if uncertain, ambiguous, or lacks sufficient verifiable community context.
   - PASSED for all legitimate civic, environmental, agricultural, or infrastructure problems.
2. predictedCategory: Must align with one of: "Water & Sanitation", "Rural Roads & Transport", "Environment & Pollution", "Public Healthcare & Clinics", "Agriculture & Irrigation", "Power & Renewable Energy", "Civic Infrastructure".
3. aiSummary: Exactly 2 clear, concise sentences summarizing (1) core problem and location, (2) impact on residents.
4. severityScore: Integer 0 to 100 representing hazard level to public welfare/safety.
5. affectedPeopleScore: Integer 0 to 100 normalized scale based on affected population.
6. frequencyScore: Integer 0 to 100 recurrence frequency (daily=90, recurring=75, occasional=45).
7. evidenceScore: Integer 0 to 100 (75-85 if evidence present, 30-45 if no evidence).
8. aiUrgencyScore: Integer 1 to 10 assessing time criticality.
9. urgencyScore: Integer 0 to 100 (aiUrgencyScore * 10).
10. aiUrgencyReason: 1 sentence justification for the urgency score.
11. rootCauseHypotheses: Array of 2-3 concise root cause hypotheses explaining underlying systemic breakdown.
12. requiredExpertise: Array of 2-4 academic/engineering disciplines required for solving this (e.g. Civil Engineering, Hydrology).
13. departmentHints: Array of 1-3 relevant Jharkhand government departments (e.g. Drinking Water and Sanitation Department).

Respond ONLY with this JSON structure:
{
  "filterStatus": "PASSED" | "REJECTED" | "FLAGGED",
  "filterReason": string,
  "confidenceScore": number,
  "predictedCategory": string,
  "predictedSubCategory": string | null,
  "aiSummary": string,
  "severityScore": number,
  "affectedPeopleScore": number,
  "frequencyScore": number,
  "evidenceScore": number,
  "urgencyScore": number,
  "aiUrgencyScore": number,
  "aiUrgencyReason": string,
  "rootCauseHypotheses": string[],
  "requiredExpertise": string[],
  "departmentHints": string[]
}
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Gemini response did not contain valid JSON.");
      }

      const rawJson = JSON.parse(jsonMatch[0]);

      // Strict validation via Zod schema
      const validation = GeminiOutputSchema.safeParse(rawJson);
      if (!validation.success) {
        console.warn("⚠️ Gemini response failed Zod schema validation:", validation.error.format());
        return mockService.analyze(problem);
      }

      const parsed = validation.data;

      // Calculate priority score using exact deterministic formula
      const { priorityScore, priorityTier } = calculatePriority({
        severityScore: parsed.severityScore,
        affectedPeopleScore: parsed.affectedPeopleScore,
        frequencyScore: parsed.frequencyScore,
        evidenceScore: parsed.evidenceScore,
        urgencyScore: parsed.urgencyScore,
      });

      return {
        filterStatus: parsed.filterStatus as FilterStatus,
        filterReason: parsed.filterReason,
        confidenceScore: parsed.confidenceScore,
        predictedCategory: parsed.predictedCategory || problem.category,
        predictedSubCategory: parsed.predictedSubCategory || problem.subCategory || null,
        aiSummary: parsed.aiSummary,
        severityScore: parsed.severityScore,
        affectedPeopleScore: parsed.affectedPeopleScore,
        frequencyScore: parsed.frequencyScore,
        evidenceScore: parsed.evidenceScore,
        urgencyScore: parsed.urgencyScore,
        aiUrgencyScore: parsed.aiUrgencyScore,
        aiUrgencyReason: parsed.aiUrgencyReason,
        priorityScore,
        priorityTier,
        rootCauseHypotheses: parsed.rootCauseHypotheses.length > 0 ? parsed.rootCauseHypotheses : [
          "Systemic infrastructure aging and deferred maintenance.",
          "Capacity overutilization in localized community zone."
        ],
        requiredExpertise: parsed.requiredExpertise.length > 0 ? parsed.requiredExpertise : [
          "Municipal Civil Engineering",
          "Public Infrastructure Planning"
        ],
        departmentHints: parsed.departmentHints.length > 0 ? parsed.departmentHints : [
          "District Urban Development Agency"
        ],
      };
    } catch (err) {
      console.warn("⚠️ Gemini AI analysis failed, falling back to deterministic mock analyzer:", err);
      return mockService.analyze(problem);
    }
  }
}
