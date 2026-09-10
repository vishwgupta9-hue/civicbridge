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

const CATEGORY_KEYWORDS: Record<
  string,
  {
    category: string;
    subCategory: string;
    keywords: string[];
    rootCauses: string[];
    expertise: string[];
    departments: string[];
  }
> = {
  water: {
    category: "Water & Sanitation",
    subCategory: "Drinking Water Supply & Quality",
    keywords: ["water", "drinking", "borewell", "handpump", "pipe", "leakage", "sewage", "drain", "drainage", "fluoride", "arsenic", "well", "tanker"],
    rootCauses: [
      "Aging underground pipeline corrosion or breakage",
      "Aquifer contamination and unmonitored industrial/surface runoff",
      "Insufficient decentralized filtration and testing infrastructure",
    ],
    expertise: [
      "Environmental Engineering",
      "Hydrogeology & Water Resource Management",
      "Public Health & Microbial Analysis",
    ],
    departments: [
      "Drinking Water and Sanitation Department (DWSD)",
      "Jharkhand State Water and Sanitation Mission",
      "Urban Development & Housing Department",
    ],
  },
  roads: {
    category: "Rural Roads & Transport",
    subCategory: "Road Maintenance & Potholes",
    keywords: ["road", "pothole", "bridge", "culvert", "highway", "transport", "bus", "traffic", "lane", "street", "pavement"],
    rootCauses: [
      "Substandard bituminous pavement compaction and inadequate road base depth",
      "Heavy monsoon waterlogging from absent side-drainage culverts",
      "Excessive axle load from heavy freight traffic exceeding rural road ratings",
    ],
    expertise: [
      "Civil & Transportation Engineering",
      "Geotechnical Material Testing",
      "Hydrological Drainage Design",
    ],
    departments: [
      "Road Construction Department (RCD)",
      "Rural Development Department (RDD - PMGSY)",
      "Jharkhand State Road Transport Corporation",
    ],
  },
  environment: {
    category: "Environment & Pollution",
    subCategory: "Air & Dust Pollution",
    keywords: ["pollution", "dust", "smoke", "air", "waste", "garbage", "dump", "coal", "industrial", "mining", "forest", "emission"],
    rootCauses: [
      "Uncovered industrial freight transport and open coal dust dispersal",
      "Improper municipal solid waste segregation and unscientific landfill burning",
      "Effluent discharge exceeding biological oxygen demand thresholds",
    ],
    expertise: [
      "Air Quality Modeling & Atmospheric Science",
      "Chemical & Environmental Waste Processing",
      "Industrial Ecology & Pollution Abatement",
    ],
    departments: [
      "Jharkhand State Pollution Control Board (JSPCB)",
      "Department of Forest, Environment and Climate Change",
      "Mines and Geology Department",
    ],
  },
  health: {
    category: "Public Healthcare & Clinics",
    subCategory: "Primary Health Center Services",
    keywords: ["hospital", "clinic", "doctor", "medicine", "health", "ambulance", "nurse", "vaccine", "disease", "illness", "medical"],
    rootCauses: [
      "Understaffed rural community health centers and specialist shortages",
      "Suboptimal cold-chain maintenance for essential vaccine supplies",
      "Diagnostic equipment disrepair due to remote maintenance bottlenecks",
    ],
    expertise: [
      "Public Health Administration & Epidemiology",
      "Biomedical Instrumentation & Cold Chain Logistics",
      "Telemedicine & Rural Health Systems",
    ],
    departments: [
      "Department of Health, Medical Education & Family Welfare",
      "National Health Mission (NHM Jharkhand)",
    ],
  },
  agriculture: {
    category: "Agriculture & Irrigation",
    subCategory: "Canal & Water Flow Control",
    keywords: ["crop", "irrigation", "canal", "farmer", "agriculture", "paddy", "sluice", "drought", "soil", "fertilizer", "harvest"],
    rootCauses: [
      "Canal siltation preventing tail-end command area water delivery",
      "Lack of micro-irrigation systems and soil moisture tracking sensors",
      "Seasonal price volatility and inadequate localized cold storage facilities",
    ],
    expertise: [
      "Agronomy & Soil Science",
      "Irrigation & Hydraulic Engineering",
      "Post-Harvest Agri-Tech & Supply Chain Logistics",
    ],
    departments: [
      "Department of Agriculture, Animal Husbandry & Co-operative",
      "Water Resources Department (Minor Irrigation)",
    ],
  },
  power: {
    category: "Power & Renewable Energy",
    subCategory: "Rural Electrification & Lighting",
    keywords: ["solar", "power", "electricity", "transformer", "pole", "wire", "outage", "streetlight", "lighting", "blackout"],
    rootCauses: [
      "Distribution transformer overload from unauthorized load spikes",
      "Vegetation contact along low-tension rural distribution lines",
      "Lack of remote grid-monitoring telemetries and automated fault isolation",
    ],
    expertise: [
      "Power Systems & High-Voltage Engineering",
      "Renewable Solar Microgrid Integration",
      "IoT Fault Diagnostics & Smart Grid Automation",
    ],
    departments: [
      "Jharkhand Bijli Vitran Nigam Limited (JBVNL)",
      "Jharkhand Renewable Energy Development Agency (JREDA)",
      "Energy Department",
    ],
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
  }): Omit<
    AIAnalysisResult,
    "isDuplicate" | "duplicateSimilarity" | "similarProblemIds" | "duplicateStatus" | "duplicateCandidateTitle"
  > {
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

    // 2. Stage 2: Categorization & Problem DNA
    let predictedCategory = problem.category || "Civic Infrastructure";
    let predictedSubCategory: string | null = problem.subCategory || null;
    let rootCauseHypotheses: string[] = [
      "Deferred civic maintenance and prolonged absence of regular inspection cycles.",
      "Accelerated wear from heavy community usage without capacity upgrades.",
      "Need for localized sensor monitoring or structural repair.",
    ];
    let requiredExpertise: string[] = [
      "Civil & Municipal Engineering",
      "Community Infrastructure Management",
      "Public Policy & Resource Planning",
    ];
    let departmentHints: string[] = [
      "Urban Development & Housing Department",
      "District Administration Triage Cell",
    ];

    for (const entry of Object.values(CATEGORY_KEYWORDS)) {
      if (entry.keywords.some((kw) => combinedText.includes(kw))) {
        predictedCategory = entry.category;
        predictedSubCategory = entry.subCategory;
        rootCauseHypotheses = entry.rootCauses;
        requiredExpertise = entry.expertise;
        departmentHints = entry.departments;
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
      rootCauseHypotheses,
      requiredExpertise,
      departmentHints,
    };
  }
}
