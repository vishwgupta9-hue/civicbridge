import { FilterStatus, PriorityTier, Problem } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { GeminiAIService } from "./gemini.ai.service.js";
import { detectDuplicates } from "./duplicate.detector.js";
import { AIAnalysisResult } from "./ai.types.js";

const aiEngine = new GeminiAIService();

/**
 * CivicBridge AI Pipeline Service
 *
 * Implements the complete multi-stage AI triage architecture:
 * 1. Relevance & Spam Classification (PASSED / REJECTED / FLAGGED)
 * 2. Domain Categorization & 2-Sentence Summarization
 * 3. Advisory Duplicate Candidate Detection (NEVER auto-rejects)
 * 4. Exact 5-Factor Normalized Priority Score Calculation
 * 5. Database Persistence and Problem Record Synchronization
 */
export class AIService {
  /**
   * Processes a submitted problem through the complete AI triage pipeline.
   * Only problems with filterStatus = PENDING are eligible for processing.
   */
  public async processProblem(problem: Problem): Promise<{
    problem: Problem;
    aiAnalysis: any;
    result: AIAnalysisResult;
  }> {
    if (problem.filterStatus !== FilterStatus.PENDING) {
      throw new Error(`Problem ${problem.id} has already been screened (filterStatus: ${problem.filterStatus}). Only PENDING problems can be processed.`);
    }

    // Stages 1, 2, & 4: Relevance, Classification, Summary, and Normalized Scoring
    const baseAnalysis = await aiEngine.analyze({
      title: problem.title,
      description: problem.description,
      category: problem.category,
      subCategory: problem.subCategory,
      district: problem.district,
      affectedCount: problem.affectedCount,
      evidenceUrl: problem.evidenceUrl,
    });

    // Stage 3: Duplicate Candidate Detection (Advisory only — never auto-rejects)
    const duplicateInfo = await detectDuplicates(
      problem.id,
      problem.title,
      problem.description,
      problem.district
    );

    const fullResult: AIAnalysisResult = {
      ...baseAnalysis,
      isDuplicate: duplicateInfo.isDuplicate,
      duplicateSimilarity: duplicateInfo.duplicateSimilarity,
      similarProblemIds: duplicateInfo.similarProblemIds,
    };

    // Stage 5 & 6: Persistence to PostgreSQL via Prisma
    // 1. Create or update AIAnalysis record
    const aiAnalysis = await prisma.aIAnalysis.upsert({
      where: { problemId: problem.id },
      update: {
        predictedCategory: fullResult.predictedCategory,
        confidenceScore: fullResult.confidenceScore,
        aiSummary: fullResult.aiSummary,
        severityScore: fullResult.severityScore,
        affectedPeopleScore: fullResult.affectedPeopleScore,
        frequencyScore: fullResult.frequencyScore,
        evidenceScore: fullResult.evidenceScore,
        urgencyScore: fullResult.urgencyScore,
        aiUrgencyScore: fullResult.aiUrgencyScore,
        aiUrgencyReason: fullResult.aiUrgencyReason,
        isDuplicate: fullResult.isDuplicate,
        duplicateSimilarity: fullResult.duplicateSimilarity,
        similarProblemIds: fullResult.similarProblemIds,
      },
      create: {
        problemId: problem.id,
        predictedCategory: fullResult.predictedCategory,
        confidenceScore: fullResult.confidenceScore,
        aiSummary: fullResult.aiSummary,
        severityScore: fullResult.severityScore,
        affectedPeopleScore: fullResult.affectedPeopleScore,
        frequencyScore: fullResult.frequencyScore,
        evidenceScore: fullResult.evidenceScore,
        urgencyScore: fullResult.urgencyScore,
        aiUrgencyScore: fullResult.aiUrgencyScore,
        aiUrgencyReason: fullResult.aiUrgencyReason,
        isDuplicate: fullResult.isDuplicate,
        duplicateSimilarity: fullResult.duplicateSimilarity,
        similarProblemIds: fullResult.similarProblemIds,
      },
    });

    // 2. Update Problem record:
    // - Updates filterStatus (PASSED, REJECTED, or FLAGGED)
    // - Updates priorityScore & priorityTier
    // - Flags verificationRequested if priorityTier is HIGH (surfaced in Govt queue)
    // - PRESERVES lifecycle status (e.g. OPEN)
    // - PRESERVES government verificationStatus (e.g. AI_SCREENED)
    const updatedProblem = await prisma.problem.update({
      where: { id: problem.id },
      data: {
        filterStatus: fullResult.filterStatus,
        filterReason: fullResult.filterReason,
        category: fullResult.predictedCategory,
        subCategory: fullResult.predictedSubCategory || problem.subCategory,
        priorityScore: fullResult.priorityScore,
        priorityTier: fullResult.priorityTier,
        verificationRequested: fullResult.priorityTier === PriorityTier.HIGH,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            district: true,
          },
        },
      },
    });

    return {
      problem: updatedProblem,
      aiAnalysis,
      result: fullResult,
    };
  }
}

export const aiService = new AIService();
