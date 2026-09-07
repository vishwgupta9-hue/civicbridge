import { FilterStatus } from "@prisma/client";
import { AIAnalysisResult } from "./ai.types.js";
import { calculatePriority } from "./priority.calculator.js";

const SPAM_KEYWORDS = [
  "crypto", "bitcoin", "lottery", "casino", "viagra", "free cash", "subscribe",
  "buy followers", "click here", "telegram", "whatsapp group", "earn money", "investment scheme"
];

const UNCERTAINTY_KEYWORDS = [
  "not sure", "maybe", "someone said", "unconfirmed", "rumor", "allegedly", "might be", "possibly"
];

const CATEGORY_KEYWORDS: Record<string, { category: string; subCategory: string; keywords: string[] }> = {
  water: {
    category: "Water & Sanitation",
    subCategory: "Drinking Water Supply & Quality",
    keywords: ["water", "drinking", "borewell", "handpump", "pipe", "leakage", "sewage", "drain", "drainage", "fluoride", "arsenic", "well", "tanker"]
  },
  roads: {
    category: "Rural Roads & Transport",
    subCategory: "Road Maintenance & Potholes",
    keywords: ["road", "pothole", "bridge", "culvert", "highway", "transport", "bus", "traffic", "lane", "street", "pavement"]
  },
  environment: {
    category: "Environment & Pollution",
    subCategory: "Air & Dust Pollution",
    keywords: ["pollution", "dust", "smoke", "air", "waste", "garbage", "dump", "coal", "industrial", "mining", "forest", "emission"]
  },
  health: {
    category: "Public Healthcare & Clinics",
    subCategory: "Primary Health Center Services",
    keywords: ["hospital", "clinic", "doctor", "medicine", "health", "ambulance", "nurse", "vaccine", "disease", "illness", "medical"]
  },
  agriculture: {
    category: "Agriculture & Irrigation",
    subCategory: "Canal & Water Flow Control",
    keywords: ["crop", "irrigation", "canal", "farmer", "agriculture", "paddy", "sluice", "drought", "soil", "fertilizer", "harvest"]
  },
  power: {
    category: "Power & Renewable Energy",
    subCategory: "Rural Electrification & Lighting",
    keywords: ["solar", "power", "electricity", "transformer", "pole", "wire", "outage", "streetlight", "lighting", "blackout"]
  },
};

/**
 * Deterministic Mock AI Service for CivicBridge.
 * Implements Stage 1 to Stage 4 heuristic analysis per docs/AI_SPEC.md.
 */
export class MockAIService {
  public analyze(problem: {
    title: string;
    description: string;
    category: string;
    subCategory?: string | null;
    district: string;
    affectedCount?: number | null;
    evidenceUrl?: string | null;
  }): Omit<AIAnalysisResult, "isDuplicate" | "duplicateSimilarity" | "similarProblemIds"> {
    const combinedText = `${problem.title} ${problem.description}`.toLowerCase();

    // 1. Stage 1: Relevance & Spam Screening
    let filterStatus: FilterStatus = FilterStatus.PASSED;
    let filterReason = "Legitimate civic problem verified by AI heuristic classifier.";
    let confidenceScore = 0.92;

    const isSpam = SPAM_KEYWORDS.some((kw) => combinedText.includes(kw));
    const isRepetitiveGibberish = /(.)\1{7,}/.test(combinedText) || combinedText.split(/\s+/).length < 4;

    if (isSpam || isRepetitiveGibberish) {
      filterStatus = FilterStatus.REJECTED;
      filterReason = isSpam
        ? "Rejected by AI Filter: Submission contains promotional spam, commercial marketing, or non-civic content."
        : "Rejected by AI Filter: Submission text appears to be automated gibberish or lacks meaningful content.";
      confidenceScore = 0.96;
    } else {
      // Check for uncertainty
      const hasUncertainty = UNCERTAINTY_KEYWORDS.some((kw) => combinedText.includes(kw));
      if (hasUncertainty || problem.description.length < 25) {
        filterStatus = FilterStatus.FLAGGED;
        filterReason = "Flagged for manual review: Submission contains ambiguous or unverified claims requiring human triage.";
        confidenceScore = 0.65;
      }
    }

    // 2. Stage 2: Categorization & 2-Sentence Summary
    let predictedCategory = problem.category || "Civic Infrastructure";
    let predictedSubCategory: string | null = problem.subCategory || null;

    for (const entry of Object.values(CATEGORY_KEYWORDS)) {
      if (entry.keywords.some((kw) => combinedText.includes(kw))) {
        predictedCategory = entry.category;
        predictedSubCategory = entry.subCategory;
        break;
      }
    }

    // 2-Sentence Concise Summary
    const cleanDesc = problem.description.replace(/\s+/g, " ").trim();
    const firstSentence = cleanDesc.split(/[.!?]\s+/)[0] || cleanDesc;
    const aiSummary = `${firstSentence}. This issue impacts approximately ${problem.affectedCount || 1} residents in ${problem.district} requiring localized intervention.`;

    // 3. Stage 4: Five Normalized Priority Factors (0 – 100)
    // Factor 1: Severity (25%)
    let severityScore = 55;
    if (/(death|life-threatening|toxic|fatal|poison|urgent danger|extreme hazard)/.test(combinedText)) {
      severityScore = 95;
    } else if (/(contamination|flooding|broken|damage|severe|injury|disease|illness|collapse|hazard)/.test(combinedText)) {
      severityScore = 80;
    } else if (/(leakage|delay|bad condition|pothole|disrepair|intermittent)/.test(combinedText)) {
      severityScore = 60;
    } else if (/(minor|bulb|cleanliness|dim|aesthetic)/.test(combinedText)) {
      severityScore = 35;
    }

    // Factor 2: Affected People (25%)
    const count = problem.affectedCount || 1;
    let affectedPeopleScore = 25;
    if (count >= 1000) affectedPeopleScore = 95;
    else if (count >= 500) affectedPeopleScore = 80;
    else if (count >= 200) affectedPeopleScore = 65;
    else if (count >= 50) affectedPeopleScore = 50;
    else if (count >= 10) affectedPeopleScore = 35;

    // Factor 3: Frequency (15%)
    let frequencyScore = 50;
    if (/(daily|constant|chronic|continuous|every day|perpetual)/.test(combinedText)) {
      frequencyScore = 90;
    } else if (/(recurring|frequently|weekly|monsoon|seasonal|regularly)/.test(combinedText)) {
      frequencyScore = 75;
    } else if (/(occasional|monthly|sometimes|intermittent)/.test(combinedText)) {
      frequencyScore = 45;
    } else {
      frequencyScore = 35;
    }

    // Factor 4: Evidence (15%)
    const evidenceScore = problem.evidenceUrl && problem.evidenceUrl.trim().length > 0 ? 80 : 35;

    // Factor 5: Urgency (20%) & raw aiUrgencyScore (1 – 10)
    let aiUrgencyScore = 5;
    let aiUrgencyReason = "Standard civic problem priority requiring systematic institutional scheduling.";

    if (severityScore >= 85 || affectedPeopleScore >= 80) {
      aiUrgencyScore = 9;
      aiUrgencyReason = "Severe public health or infrastructure disruption requiring immediate administrative attention.";
    } else if (severityScore >= 70 || affectedPeopleScore >= 60) {
      aiUrgencyScore = 7;
      aiUrgencyReason = "Elevated impact on community welfare requiring coordinated institutional solution.";
    } else if (severityScore <= 40 && affectedPeopleScore <= 35) {
      aiUrgencyScore = 3;
      aiUrgencyReason = "Localized issue with modest societal disruption; standard backlog placement.";
    }

    const urgencyScore = aiUrgencyScore * 10; // Normalized 0 – 100

    // Exact Approved Formula
    const { priorityScore, priorityTier } = calculatePriority({
      severityScore,
      affectedPeopleScore,
      frequencyScore,
      evidenceScore,
      urgencyScore,
    });

    return {
      filterStatus,
      filterReason,
      confidenceScore,
      predictedCategory,
      predictedSubCategory,
      aiSummary,
      severityScore,
      affectedPeopleScore,
      frequencyScore,
      evidenceScore,
      urgencyScore,
      aiUrgencyScore,
      aiUrgencyReason,
      priorityScore,
      priorityTier,
    };
  }
}
