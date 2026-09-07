import { GoogleGenAI } from "@google/genai";
import { FilterStatus } from "@prisma/client";
import { config } from "../../config/index.js";
import { AIAnalysisResult } from "./ai.types.js";
import { calculatePriority } from "./priority.calculator.js";
import { MockAIService } from "./mock.ai.service.js";

const mockService = new MockAIService();

/**
 * Gemini AI Service for CivicBridge.
 * Uses Google Gemini API when configured, otherwise falls back seamlessly to MockAIService.
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
  }): Promise<Omit<AIAnalysisResult, "isDuplicate" | "duplicateSimilarity" | "similarProblemIds">> {
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
  "aiUrgencyReason": string
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

      const parsed = JSON.parse(jsonMatch[0]);

      // Calculate priority score using exact formula
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
        confidenceScore: parsed.confidenceScore || 0.9,
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
      };
    } catch (err) {
      console.warn("⚠️ Gemini AI analysis failed, falling back to deterministic mock analyzer:", err);
      return mockService.analyze(problem);
    }
  }
}
