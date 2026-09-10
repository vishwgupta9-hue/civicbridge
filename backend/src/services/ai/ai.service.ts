import { FilterStatus, PriorityTier, Problem } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { GeminiAIService } from "./gemini.ai.service.js";
import { detectDuplicates } from "./duplicate.detector.js";
import { embeddingService } from "./embedding.service.js";
import { AIAnalysisResult } from "./ai.types.js";

const aiEngine = new GeminiAIService();

/**
 * CivicBridge AI Pipeline Service
 *
 * Implements the complete multi-stage AI triage architecture:
 * 1. Relevance & Spam Classification (PASSED / REJECTED / FLAGGED)
 * 2. Domain Categorization & 2-Sentence Summarization
 * 3. Problem DNA Extraction (Root-Causes, Required Expertise, Department Hints)
 * 4. Text Embedding Generation & PostgreSQL pgvector Storage
 * 5. Advisory Duplicate Candidate Detection (pgvector + Jaccard fallback)
 * 6. Exact 5-Factor Normalized Priority Score Calculation
 * 7. Database Persistence and Problem Record Synchronization
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
      throw new Error(
        `Problem ${problem.id} has already been screened (filterStatus: ${problem.filterStatus}). Only PENDING problems can be processed.`
      );
    }

    // Stages 1, 2, & 3: Relevance, Classification, Summary, Scoring & Problem DNA
    const baseAnalysis = await aiEngine.analyze({
      title: problem.title,
      description: problem.description,
      category: problem.category,
      subCategory: problem.subCategory,
      district: problem.district,
      affectedCount: problem.affectedCount,
      evidenceUrl: problem.evidenceUrl,
    });

    // Stage 4: Embedding generation
    const embeddingText = `${problem.title}. ${problem.description}. Category: ${baseAnalysis.predictedCategory}. District: ${problem.district}.`;
    const embedding = await embeddingService.generateEmbedding(embeddingText);

    // Stage 5: Advisory Duplicate Detection (pgvector preferred, Jaccard fallback)
    const duplicateInfo = await detectDuplicates(
      problem.id,
      problem.title,
      problem.description,
      problem.district,
      embedding
    );

    const fullResult: AIAnalysisResult = {
      ...baseAnalysis,
      isDuplicate: duplicateInfo.isDuplicate,
      duplicateSimilarity: duplicateInfo.duplicateSimilarity,
      similarProblemIds: duplicateInfo.similarProblemIds,
      duplicateStatus: duplicateInfo.duplicateStatus,
      duplicateCandidateTitle: duplicateInfo.duplicateCandidateTitle,
    };

    // Stage 6: Persistence to PostgreSQL via Prisma
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
        rootCauseHypotheses: fullResult.rootCauseHypotheses,
        requiredExpertise: fullResult.requiredExpertise,
        departmentHints: fullResult.departmentHints,
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
        rootCauseHypotheses: fullResult.rootCauseHypotheses,
        requiredExpertise: fullResult.requiredExpertise,
        departmentHints: fullResult.departmentHints,
      },
    });

    // Stage 7: Persist vector embedding into PostgreSQL pgvector column
    if (embedding && embedding.length === 1536) {
      await embeddingService.storeEmbedding(aiAnalysis.id, embedding);
    }

    // Stage 8: Update Problem record
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
