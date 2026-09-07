import prisma from "../../lib/prisma.js";

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicateSimilarity: number | null;
  similarProblemIds: string[];
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
function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
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
 * Detects potential duplicate candidates in the database based on title and description overlap.
 *
 * MANDATORY RULE: Duplicate detection is purely advisory.
 * A high similarity match must NEVER automatically reject a problem.
 */
export async function detectDuplicates(
  currentProblemId: string,
  title: string,
  description: string,
  district: string
): Promise<DuplicateDetectionResult> {
  // Fetch recent problems in the same district or across Jharkhand
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

  const matches: { id: string; similarity: number }[] = [];

  for (const candidate of candidates) {
    const titleSimilarity = calculateJaccardSimilarity(tokenize(title), tokenize(candidate.title));
    const descSimilarity = calculateJaccardSimilarity(tokenize(description), tokenize(candidate.description));

    // Weighted composite similarity: title carries higher distinctive weight
    const compositeSimilarity = titleSimilarity * 0.6 + descSimilarity * 0.4;

    // Boost similarity if in the same district
    const sameDistrict = candidate.district.toLowerCase() === district.toLowerCase();
    const adjustedSimilarity = sameDistrict
      ? Math.min(1.0, compositeSimilarity * 1.25)
      : compositeSimilarity;

    // Threshold for potential duplicate candidate: >= 0.25
    if (adjustedSimilarity >= 0.25) {
      matches.push({
        id: candidate.id,
        similarity: Math.round(adjustedSimilarity * 100) / 100,
      });
    }
  }

  // Sort descending by similarity
  matches.sort((a, b) => b.similarity - a.similarity);

  const isDuplicate = matches.length > 0;
  const duplicateSimilarity = matches.length > 0 ? matches[0].similarity : null;
  const similarProblemIds = matches.map((m) => m.id);

  return {
    isDuplicate,
    duplicateSimilarity,
    similarProblemIds,
  };
}
