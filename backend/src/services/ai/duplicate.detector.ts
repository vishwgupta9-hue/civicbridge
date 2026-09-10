import prisma from "../../lib/prisma.js";
import { DuplicateStatus } from "./ai.types.js";
import { embeddingService } from "./embedding.service.js";

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicateSimilarity: number | null;
  similarProblemIds: string[];
  duplicateStatus: DuplicateStatus;
  duplicateCandidateTitle?: string | null;
  detectionMethod: "pgvector_cosine" | "heuristic_jaccard";
}

/**
 * Tokenizes and normalizes text into word sets for Jaccard similarity comparison.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

/**
 * Calculates Jaccard similarity between two token sets: |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : Math.round((intersectionCount / unionCount) * 100) / 100;
}

/**
 * Detects potential duplicate candidates in the database.
 * Preferred order:
 * 1. Embedding similarity using PostgreSQL + pgvector
 * 2. Deterministic Jaccard similarity fallback if pgvector or embeddings are unavailable
 *
 * SPECIFICATION THRESHOLDS:
 * - > 0.85: strong similarity (likely duplicate)
 * - 0.70 – 0.85: potentially related
 * - < 0.70: usually distinct
 *
 * MANDATORY GOVERNANCE RULE:
 * Duplicate detection is purely advisory.
 * A high similarity match must NEVER automatically reject or hide a problem.
 */
export async function detectDuplicates(
  currentProblemId: string,
  title: string,
  description: string,
  district: string,
  embedding?: number[]
): Promise<DuplicateDetectionResult> {
  // 1. Primary Method: pgvector Cosine Distance Search
  if (embedding && embedding.length === 1536) {
    try {
      const vectorMatches = await embeddingService.findSimilarProblems(embedding, currentProblemId, 5);

      if (vectorMatches.length > 0) {
        const topMatch = vectorMatches[0];
        const topSim = topMatch.similarity;

        let status: DuplicateStatus = "distinct";
        if (topSim > 0.85) {
          status = "likely_duplicate";
        } else if (topSim >= 0.70) {
          status = "potentially_related";
        }

        const relatedMatches = vectorMatches.filter((m) => m.similarity >= 0.70);

        return {
          isDuplicate: status !== "distinct",
          duplicateSimilarity: topSim,
          similarProblemIds: relatedMatches.map((m) => m.problemId),
          duplicateStatus: status,
          duplicateCandidateTitle: topMatch.title,
          detectionMethod: "pgvector_cosine",
        };
      }
    } catch (err) {
      console.warn("⚠️ pgvector duplicate detection query failed, falling back to Jaccard:", err);
    }
  }

  // 2. Fallback Method: Deterministic Heuristic Jaccard Similarity
  const candidates = await prisma.problem.findMany({
    where: {
      id: { not: currentProblemId },
    },
    select: {
      id: true,
      title: true,
      description: true,
      district: true,
    },
    take: 50,
  });

  const matches: { id: string; title: string; similarity: number }[] = [];

  for (const candidate of candidates) {
    const titleSim = calculateJaccardSimilarity(tokenize(title), tokenize(candidate.title));
    const descSim = calculateJaccardSimilarity(tokenize(description), tokenize(candidate.description));

    // Weighted composite: title carries higher weight
    const compositeSimilarity = titleSim * 0.6 + descSim * 0.4;

    // Boost similarity if in the exact same district
    const sameDistrict = candidate.district.toLowerCase() === district.toLowerCase();
    const adjustedSimilarity = sameDistrict
      ? Math.min(1.0, compositeSimilarity * 1.25)
      : compositeSimilarity;

    // Calibrate heuristic Jaccard overlap to the 0.0 - 1.0 specification range
    // (In natural language reports, 0.30+ lexical overlap indicates high duplication)
    const normalizedSim = Math.min(1.0, Math.round(adjustedSimilarity * 2.2 * 100) / 100);

    if (normalizedSim >= 0.70) {
      matches.push({
        id: candidate.id,
        title: candidate.title,
        similarity: normalizedSim,
      });
    }
  }

  // Sort descending
  matches.sort((a, b) => b.similarity - a.similarity);

  const top = matches[0];
  const topSim = top ? top.similarity : null;

  let status: DuplicateStatus = "distinct";
  if (topSim !== null) {
    if (topSim > 0.85) {
      status = "likely_duplicate";
    } else if (topSim >= 0.70) {
      status = "potentially_related";
    }
  }

  return {
    isDuplicate: status !== "distinct",
    duplicateSimilarity: topSim,
    similarProblemIds: matches.map((m) => m.id),
    duplicateStatus: status,
    duplicateCandidateTitle: top ? top.title : null,
    detectionMethod: "heuristic_jaccard",
  };
}
