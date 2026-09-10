import prisma from "../lib/prisma.js";
import { OfferCategory, NeedUrgency } from "@prisma/client";

export interface MatchScoreResult<T> {
  item: T;
  score: number;
  matchReasons: string[];
}

/**
 * Deterministic, explainable matching engine between Needs and Offers.
 * Considers:
 * 1. Exact OfferCategory compatibility (40 pts)
 * 2. District & location proximity or statewide availability (10-35 pts)
 * 3. Domain & expertise synergy with project/organization context (15 pts)
 * 4. Complementary cross-sector collaboration (10 pts)
 * 
 * Excludes:
 * - Self-matching (same organization)
 * - Inactive offers or closed needs
 */
export class MatchingService {
  /**
   * Find matching active Offers for a specific Need.
   */
  static async matchOffersForNeed(
    needId: string,
    options: { minScore?: number; limit?: number } = {}
  ): Promise<MatchScoreResult<any>[]> {
    const minScore = options.minScore ?? 30;
    const limit = options.limit ?? 20;

    const need = await prisma.need.findUnique({
      where: { id: needId },
      include: {
        creatorOrg: true,
        project: {
          include: {
            problems: {
              include: {
                problem: true,
              },
            },
          },
        },
      },
    });

    if (!need) {
      throw new Error(`Need with ID ${needId} not found`);
    }

    // Candidate offers: must match category and be ACTIVE, from different org
    const candidateOffers = await prisma.offer.findMany({
      where: {
        category: need.category,
        status: "ACTIVE",
        providerOrgId: { not: need.creatorOrgId },
      },
      include: {
        providerOrg: true,
      },
    });

    const results: MatchScoreResult<any>[] = [];

    for (const offer of candidateOffers) {
      const matchReasons: string[] = [];
      let score = 0;

      // 1. Category match (baseline 40 points)
      score += 40;
      matchReasons.push(`Category match: ${need.category.replace(/_/g, " ")}`);

      // 2. District / Location relevance
      const needDistrict = need.district || need.project?.problems[0]?.problem.district || need.creatorOrg.district;
      const offerDistrict = offer.district;

      if (!offerDistrict || offerDistrict.toUpperCase() === "STATEWIDE") {
        score += 25;
        matchReasons.push("Statewide capability: Available across all Jharkhand districts");
      } else if (
        needDistrict &&
        offerDistrict.trim().toLowerCase() === needDistrict.trim().toLowerCase()
      ) {
        score += 35;
        matchReasons.push(`Location proximity: Local capability in ${offerDistrict}`);
      } else if (needDistrict) {
        score += 15;
        matchReasons.push(`Inter-district capability accessible from ${offerDistrict} to ${needDistrict}`);
      } else {
        score += 20;
        matchReasons.push("General capability accessibility across Jharkhand");
      }

      // 3. Domain & Expertise synergy with Project context
      if (need.project) {
        const projectText = `${need.project.title} ${need.project.executiveSummary} ${need.project.technicalApproach}`.toLowerCase();
        const offerText = `${offer.title} ${offer.specifications}`.toLowerCase();
        
        let hasSynergy = false;
        for (const tag of offer.providerOrg.expertiseTags || []) {
          if (projectText.includes(tag.toLowerCase()) || offerText.includes(tag.toLowerCase())) {
            hasSynergy = true;
            break;
          }
        }
        for (const tag of offer.providerOrg.domainTags || []) {
          if (projectText.includes(tag.toLowerCase())) {
            hasSynergy = true;
            break;
          }
        }

        if (hasSynergy) {
          score += 15;
          matchReasons.push("Domain alignment: Provider expertise matches project technical scope");
        }
      }

      // 4. Cross-sector synergy
      if (need.creatorOrg.type !== offer.providerOrg.type) {
        score += 10;
        matchReasons.push(
          `Cross-sector synergy: ${need.creatorOrg.type} initiative paired with ${offer.providerOrg.type} capability`
        );
      }

      // Urgency boost
      if (need.urgency === NeedUrgency.CRITICAL_PATH) {
        matchReasons.push("Critical path need: High priority requirement for immediate collaboration");
      }

      const normalizedScore = Math.min(100, score);
      if (normalizedScore >= minScore) {
        results.push({
          item: offer,
          score: normalizedScore,
          matchReasons,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Find matching open Needs for a specific Offer.
   */
  static async matchNeedsForOffer(
    offerId: string,
    options: { minScore?: number; limit?: number } = {}
  ): Promise<MatchScoreResult<any>[]> {
    const minScore = options.minScore ?? 30;
    const limit = options.limit ?? 20;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        providerOrg: true,
      },
    });

    if (!offer) {
      throw new Error(`Offer with ID ${offerId} not found`);
    }

    // Candidate needs: same category, OPEN or COMMITTED status, different org
    const candidateNeeds = await prisma.need.findMany({
      where: {
        category: offer.category,
        status: { in: ["OPEN", "COMMITTED"] },
        creatorOrgId: { not: offer.providerOrgId },
      },
      include: {
        creatorOrg: true,
        project: {
          include: {
            problems: {
              include: {
                problem: true,
              },
            },
          },
        },
      },
    });

    const results: MatchScoreResult<any>[] = [];

    for (const need of candidateNeeds) {
      const matchReasons: string[] = [];
      let score = 0;

      // 1. Category match
      score += 40;
      matchReasons.push(`Category match: ${offer.category.replace(/_/g, " ")}`);

      // 2. District / Location relevance
      const needDistrict = need.district || need.project?.problems[0]?.problem.district || need.creatorOrg.district;
      const offerDistrict = offer.district;

      if (!offerDistrict || offerDistrict.toUpperCase() === "STATEWIDE") {
        score += 25;
        matchReasons.push("Statewide capability: Can fulfill needs across all Jharkhand districts");
      } else if (
        needDistrict &&
        offerDistrict.trim().toLowerCase() === needDistrict.trim().toLowerCase()
      ) {
        score += 35;
        matchReasons.push(`Location proximity: Local need in ${needDistrict}`);
      } else if (needDistrict) {
        score += 15;
        matchReasons.push(`Inter-district support feasible for ${needDistrict}`);
      } else {
        score += 20;
        matchReasons.push("Regional support applicable across Jharkhand");
      }

      // 3. Project context alignment
      if (need.project) {
        const projectText = `${need.project.title} ${need.project.executiveSummary}`.toLowerCase();
        let hasSynergy = false;
        for (const tag of offer.providerOrg.expertiseTags || []) {
          if (projectText.includes(tag.toLowerCase())) {
            hasSynergy = true;
            break;
          }
        }
        if (hasSynergy) {
          score += 15;
          matchReasons.push("Direct initiative alignment: Project requires your specific institutional expertise");
        }
      }

      // 4. Cross-sector synergy
      if (need.creatorOrg.type !== offer.providerOrg.type) {
        score += 10;
        matchReasons.push(`Synergy: Connecting your ${offer.providerOrg.type} assets with a ${need.creatorOrg.type} initiative`);
      }

      // Urgency factor
      if (need.urgency === NeedUrgency.CRITICAL_PATH) {
        score += 10;
        matchReasons.push("Urgent priority: Critical path deliverable needing rapid deployment");
      }

      const normalizedScore = Math.min(100, score);
      if (normalizedScore >= minScore) {
        results.push({
          item: need,
          score: normalizedScore,
          matchReasons,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
