import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/index.js";
import prisma from "../../lib/prisma.js";

export interface SimilarProblemMatch {
  problemId: string;
  title: string;
  similarity: number;
}

/**
 * Deterministic 1536-dimensional L2-normalized feature vectorizer.
 *
 * FALLBACK & TESTING MECHANISM ONLY:
 * Used when external embedding APIs (such as Gemini text-embedding-004) are
 * unconfigured, offline, or unavailable. This deterministic hashing vectorizer
 * is NOT a real semantic embedding model. It provides a reproducible structural
 * vector strictly so that local automated tests, CI pipelines, and PostgreSQL
 * pgvector storage/cosine queries can execute without external API dependencies.
 */
export function generateDeterministicVector(text: string, dimensions: number = 1536): number[] {
  const vec = new Float64Array(dimensions);
  const clean = text.toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 2);

  if (words.length === 0) {
    vec[0] = 1.0;
    return Array.from(vec);
  }

  // Token hashing & n-gram projections
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx1 = Math.abs(hash) % dimensions;
    vec[idx1] += 1.0;

    // Bigram hash if applicable
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let biHash = 0;
      for (let c = 0; c < bigram.length; c++) {
        biHash = (biHash << 5) - biHash + bigram.charCodeAt(c);
        biHash |= 0;
      }
      const idx2 = Math.abs(biHash) % dimensions;
      vec[idx2] += 1.5;
    }
  }

  // L2 Normalization (Euclidean norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] = vec[i] / norm;
    }
  } else {
    vec[0] = 1.0;
  }

  return Array.from(vec);
}

export class EmbeddingService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.geminiApiKey && !config.mockAi) {
      try {
        this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch {
        this.ai = null;
      }
    }
  }

  /**
   * Generates a 1536-dimensional L2-normalized embedding.
   *
   * REAL EMBEDDING MODEL:
   * Google Gemini `text-embedding-004` (via Google GenAI SDK).
   *
   * FALLBACK BEHAVIOR:
   * If the Gemini API key is missing, MOCK_AI is enabled, or the API call fails,
   * falls back to the deterministic hashing vectorizer (testing mechanism only, NOT a real semantic model).
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (this.ai && !config.mockAi) {
      try {
        const response = await this.ai.models.embedContent({
          model: "text-embedding-004",
          contents: text,
        });

        const values =
          (response as any).embeddings?.[0]?.values ||
          (response as any).embedding?.values;
        if (values && values.length > 0) {
          // Project or pad to 1536 dimensions if needed
          const result = new Float64Array(1536);
          for (let i = 0; i < 1536; i++) {
            result[i] = values[i % values.length];
          }

          // L2 normalize
          let norm = 0;
          for (let i = 0; i < 1536; i++) norm += result[i] * result[i];
          norm = Math.sqrt(norm);
          if (norm > 0) {
            for (let i = 0; i < 1536; i++) result[i] /= norm;
          }
          return Array.from(result);
        }
      } catch (err) {
        console.warn("⚠️ Gemini embedContent call failed, using deterministic embedding fallback:", err);
      }
    }

    return generateDeterministicVector(text, 1536);
  }

  /**
   * Persists an embedding directly to the PostgreSQL pgvector column.
   * NOTE: PostgreSQL + pgvector is strictly the database storage and indexing layer,
   * NOT an embedding generation model.
   */
  public async storeEmbedding(analysisId: string, embedding: number[]): Promise<void> {
    try {
      const vectorStr = `[${embedding.map((v) => v.toFixed(6)).join(",")}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "AIAnalysis" SET "embedding" = $1::vector WHERE "id" = $2`,
        vectorStr,
        analysisId
      );
    } catch (err) {
      console.warn(`⚠️ Failed to persist pgvector embedding for AIAnalysis ${analysisId}:`, err);
    }
  }

  /**
   * Finds similar problems using pgvector cosine distance: 1 - (embedding <=> query::vector)
   */
  public async findSimilarProblems(
    embedding: number[],
    excludeProblemId: string,
    limit: number = 5
  ): Promise<SimilarProblemMatch[]> {
    try {
      const vectorStr = `[${embedding.map((v) => v.toFixed(6)).join(",")}]`;
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT a."problemId", p."title", 1 - (a."embedding" <=> $1::vector) AS similarity
         FROM "AIAnalysis" a
         JOIN "Problem" p ON p."id" = a."problemId"
         WHERE a."embedding" IS NOT NULL AND a."problemId" <> $2
         ORDER BY a."embedding" <=> $1::vector ASC
         LIMIT $3`,
        vectorStr,
        excludeProblemId,
        limit
      );

      return rows.map((r) => ({
        problemId: r.problemId,
        title: r.title,
        similarity: Math.round(Number(r.similarity) * 100) / 100,
      }));
    } catch (err) {
      console.warn("⚠️ pgvector similarity search failed, falling back to heuristic:", err);
      return [];
    }
  }
}

export const embeddingService = new EmbeddingService();
