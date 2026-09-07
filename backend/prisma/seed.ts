import { PrismaClient, Role, OrganizationType, PriorityTier, VerificationStatus, ProblemStatus, FilterStatus, SupportType, VentureStage, ProposalStatus, CollaborationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic UUIDs for idempotent seeding
const SEED_IDS = {
  // Organizations
  ORG_UNIVERSITY: "11111111-1111-4111-a111-111111111111",
  ORG_INDUSTRY: "22222222-2222-4222-a222-222222222222",
  ORG_STARTUP: "33333333-3333-4333-a333-333333333333",

  // Users
  USER_CITIZEN: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  USER_ADMIN: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  USER_UNIVERSITY: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
  USER_INDUSTRY: "dddddddd-dddd-4ddd-dddd-dddddddddddd",
  USER_STARTUP: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",

  // Problems
  PROBLEM_1: "f1111111-1111-4111-8111-111111111111", // Water / Ranchi / HIGH / GOVERNMENT_VERIFIED
  PROBLEM_2: "f2222222-2222-4222-8222-222222222222", // Air / Dhanbad / HIGH / AI_SCREENED
  PROBLEM_3: "f3333333-3333-4333-8333-333333333333", // Drainage / East Singhbhum / MEDIUM / GOVERNMENT_VERIFIED
  PROBLEM_4: "f4444444-4444-4444-8444-444444444444", // Canal / Hazaribagh / MEDIUM / AI_SCREENED
  PROBLEM_5: "f5555555-5555-4555-8555-555555555555", // Solar / Bokaro / LOW / AI_SCREENED

  // Children
  PROPOSAL_1: "77777777-7777-4777-a777-777777777777",
  CONCEPT_1: "88888888-8888-4888-a888-888888888888",
  COLLAB_1: "99999999-9999-4999-a999-999999999999",
  UPDATE_PROPOSAL: "66666666-6666-4666-a666-666666666666",
  UPDATE_CONCEPT: "55555555-5555-4555-a555-555555555555",
};

// Documented development passwords
export const DEV_PASSWORDS = {
  CITIZEN: "CivicPass123!",
  ADMIN: "AdminPass123!",
  UNIVERSITY: "UniPass123!",
  INDUSTRY: "IndustryPass123!",
  STARTUP: "StartupPass123!",
};

// 12 salt rounds per project specification (TRD.md / USER_FLOW.md)
const BCRYPT_SALT_ROUNDS = 12;

const DEV_HASHES = {
  CITIZEN: bcrypt.hashSync(DEV_PASSWORDS.CITIZEN, BCRYPT_SALT_ROUNDS),
  ADMIN: bcrypt.hashSync(DEV_PASSWORDS.ADMIN, BCRYPT_SALT_ROUNDS),
  UNIVERSITY: bcrypt.hashSync(DEV_PASSWORDS.UNIVERSITY, BCRYPT_SALT_ROUNDS),
  INDUSTRY: bcrypt.hashSync(DEV_PASSWORDS.INDUSTRY, BCRYPT_SALT_ROUNDS),
  STARTUP: bcrypt.hashSync(DEV_PASSWORDS.STARTUP, BCRYPT_SALT_ROUNDS),
};

async function main() {
  console.log("🌱 Starting CivicBridge Development Seed...");

  // =========================================================================
  // 1. ORGANIZATIONS (University, Industry, Startup)
  // =========================================================================
  console.log("  → Upserting Organizations...");

  const orgUniversity = await prisma.organization.upsert({
    where: { id: SEED_IDS.ORG_UNIVERSITY },
    update: {},
    create: {
      id: SEED_IDS.ORG_UNIVERSITY,
      name: "Birla Institute of Technology (BIT) Mesra",
      type: OrganizationType.UNIVERSITY,
      regCode: "AICTE-JH-00123",
      domainTags: ["Environmental Engineering", "IoT & Sensing", "Civil Works"],
      expertiseTags: ["Water Quality Analysis", "Embedded Systems", "GIS Mapping"],
      district: "Ranchi",
      state: "Jharkhand",
      contactEmail: "rnd@bitmesra.ac.in",
      contactPhone: "+91-651-2275444",
    },
  });

  const orgIndustry = await prisma.organization.upsert({
    where: { id: SEED_IDS.ORG_INDUSTRY },
    update: {},
    create: {
      id: SEED_IDS.ORG_INDUSTRY,
      name: "Tata Steel CSR & Sustainability Division",
      type: OrganizationType.INDUSTRY,
      regCode: "CIN-L27100MH1907PLC000260",
      domainTags: ["Clean Tech", "Rural Infrastructure", "Industrial Waste"],
      expertiseTags: ["Prototyping Labs", "Pilot Testing Facilities", "Mentorship"],
      district: "East Singhbhum",
      state: "Jharkhand",
      contactEmail: "sustainability@tatasteel.com",
      contactPhone: "+91-657-2431234",
    },
  });

  const orgStartup = await prisma.organization.upsert({
    where: { id: SEED_IDS.ORG_STARTUP },
    update: {},
    create: {
      id: SEED_IDS.ORG_STARTUP,
      name: "JharJal CleanTech Innovations Pvt Ltd",
      type: OrganizationType.STARTUP,
      regCode: "DPIIT-JH-2024-8891",
      domainTags: ["Clean Drinking Water", "Affordable Filtration", "IoT Monitoring"],
      expertiseTags: ["Adsorption Technology", "Low-Cost Sensors", "Community Distribution"],
      district: "Ranchi",
      state: "Jharkhand",
      contactEmail: "contact@jharjal.in",
      contactPhone: "+91-9431109988",
    },
  });

  // =========================================================================
  // 2. USERS (5 Authenticated Roles)
  // =========================================================================
  console.log("  → Upserting Users (5 roles)...");

  const userCitizen = await prisma.user.upsert({
    where: { id: SEED_IDS.USER_CITIZEN },
    update: { passwordHash: DEV_HASHES.CITIZEN },
    create: {
      id: SEED_IDS.USER_CITIZEN,
      name: "Sunita Soren",
      email: "citizen.sunita@civicbridge.dev",
      passwordHash: DEV_HASHES.CITIZEN,
      role: Role.CITIZEN,
      phone: "+91-9876543210",
      district: "Ranchi",
    },
  });

  const userAdmin = await prisma.user.upsert({
    where: { id: SEED_IDS.USER_ADMIN },
    update: { passwordHash: DEV_HASHES.ADMIN },
    create: {
      id: SEED_IDS.USER_ADMIN,
      name: "Rajeshwar Verma (Deputy Commissioner Office)",
      email: "admin.verma@civicbridge.gov.in",
      passwordHash: DEV_HASHES.ADMIN,
      role: Role.ADMIN,
      phone: "+91-9431122334",
      district: "Ranchi",
    },
  });

  const userUniversity = await prisma.user.upsert({
    where: { id: SEED_IDS.USER_UNIVERSITY },
    update: { passwordHash: DEV_HASHES.UNIVERSITY },
    create: {
      id: SEED_IDS.USER_UNIVERSITY,
      name: "Dr. Ananya Mukhopadhyay",
      email: "faculty.ananya@bitmesra.ac.in",
      passwordHash: DEV_HASHES.UNIVERSITY,
      role: Role.UNIVERSITY,
      phone: "+91-9431155667",
      district: "Ranchi",
      organizationId: orgUniversity.id,
    },
  });

  const userIndustry = await prisma.user.upsert({
    where: { id: SEED_IDS.USER_INDUSTRY },
    update: { passwordHash: DEV_HASHES.INDUSTRY },
    create: {
      id: SEED_IDS.USER_INDUSTRY,
      name: "Vikram Sengupta (CSR Lead)",
      email: "vikram.sengupta@tatasteel.com",
      passwordHash: DEV_HASHES.INDUSTRY,
      role: Role.INDUSTRY,
      phone: "+91-9835101020",
      district: "East Singhbhum",
      organizationId: orgIndustry.id,
    },
  });

  const userStartup = await prisma.user.upsert({
    where: { id: SEED_IDS.USER_STARTUP },
    update: { passwordHash: DEV_HASHES.STARTUP },
    create: {
      id: SEED_IDS.USER_STARTUP,
      name: "Amit Kumar Murmu (Founder)",
      email: "founder.amit@jharjal.in",
      passwordHash: DEV_HASHES.STARTUP,
      role: Role.STARTUP,
      phone: "+91-9431109988",
      district: "Ranchi",
      organizationId: orgStartup.id,
    },
  });

  // =========================================================================
  // 3. CIVIC PROBLEMS & AI ANALYSIS (5 realistic problems)
  //
  // Approved Formula:
  // Priority Score = (Severity*0.25) + (AffectedPeople*0.25) + (Frequency*0.15) + (Evidence*0.15) + (Urgency*0.20)
  // Tiers: HIGH (70–100), MEDIUM (40–69), LOW (0–39)
  // =========================================================================
  console.log("  → Upserting 5 Civic Problems with AI Analysis...");

  // Problem 1: Water Contamination / Ranchi (HIGH: 83.5 / GOVERNMENT_VERIFIED)
  // Severity=85, Affected=80, Frequency=90, Evidence=85, Urgency=80
  // Score: (85*0.25) + (80*0.25) + (90*0.15) + (85*0.15) + (80*0.20) = 21.25 + 20.0 + 13.5 + 12.75 + 16.0 = 83.5
  const problem1 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_1 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_1,
      title: "Excess Fluoride and Heavy Metal Contamination in Angara Block Borewells",
      description: "Community drinking water handpumps across 4 villages in Angara block are dispensing water with fluoride levels exceeding 3.5 mg/L. Over 1,200 villagers and school children report joint pain, dental fluorosis, and gastrointestinal symptoms. Immediate filtration and decentralized testing are required.",
      category: "Water & Sanitation",
      subCategory: "Drinking Water Contamination",
      district: "Ranchi",
      locationText: "Angara Block, Villages: Nawagarh, Baredih, Rajaulatu",
      latitude: 23.3644,
      longitude: 85.5298,
      affectedCount: 1200,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/ranchi_water_test_2026.pdf",
      status: ProblemStatus.IN_PROGRESS,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Clear civic problem with severe public health impact and supporting water test lab reports.",
      priorityScore: 83.5,
      priorityTier: PriorityTier.HIGH,
      verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED,
      verificationNotes: "Verified on-site by District Public Health Engineering Department (PHED) team. Chemical analysis confirms hazardous fluoride levels.",
      verifiedAt: new Date("2026-03-01T10:30:00Z"),
      verifiedById: userAdmin.id,
      verificationRequested: true,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem1.id },
    update: {},
    create: {
      problemId: problem1.id,
      predictedCategory: "Water & Sanitation",
      confidenceScore: 0.96,
      aiSummary: "High-priority groundwater fluoride contamination across multiple Angara villages causing acute dental and skeletal fluorosis among ~1,200 residents.",
      severityScore: 85,
      affectedPeopleScore: 80,
      frequencyScore: 90,
      evidenceScore: 85,
      urgencyScore: 80,
      aiUrgencyScore: 9,
      aiUrgencyReason: "Potentially toxic fluoride intake requires urgent clean water access to prevent irreversible pediatric skeletal deformities.",
      isDuplicate: false,
    },
  });

  await prisma.validation.upsert({
    where: { problemId: problem1.id },
    update: {},
    create: {
      problemId: problem1.id,
      reviewedById: userAdmin.id,
      severityScore: 85,
      affectedScore: 80,
      frequencyScore: 90,
      evidenceScore: 85,
      urgencyScore: 80,
      decision: VerificationStatus.GOVERNMENT_VERIFIED,
      remarks: "Field inspection confirmed by PHED Ranchi. Safe alternative tankers dispatched pending institutional water filtration unit installation.",
    },
  });

  // Problem 2: Air Pollution / Dhanbad (HIGH: 86.0 / AI_SCREENED)
  // Severity=90, Affected=75, Frequency=95, Evidence=90, Urgency=85
  // Score: (90*0.25) + (75*0.25) + (95*0.15) + (90*0.15) + (85*0.20) = 22.5 + 18.75 + 14.25 + 13.5 + 17.0 = 86.0
  const problem2 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_2 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_2,
      title: "Severe Coal Dust Dispersion along Jharia-Sindri Haul Road Corridor",
      description: "Uncovered dumper trucks transporting raw coking coal generate dense particulate clouds exceeding PM2.5 levels of 380 ug/m3 throughout daytime transit hours. Over 800 households and 2 primary schools along the 6km stretch suffer severe respiratory illnesses.",
      category: "Environment & Pollution",
      subCategory: "Air Quality & Industrial Dust",
      district: "Dhanbad",
      locationText: "Jharia-Sindri Link Road, Near Bastacola Crossing",
      latitude: 23.7423,
      longitude: 86.4172,
      affectedCount: 800,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/dhanbad_air_sensor_log.pdf",
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Legitimate environmental hazard with empirical sensor metrics and photographic evidence.",
      priorityScore: 86.0,
      priorityTier: PriorityTier.HIGH,
      verificationStatus: VerificationStatus.AI_SCREENED, // Parallel trust model: immediately visible even before govt verification
      verificationRequested: true,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem2.id },
    update: {},
    create: {
      problemId: problem2.id,
      predictedCategory: "Environment & Pollution",
      confidenceScore: 0.94,
      aiSummary: "Critical fugitive coal dust emissions along Jharia transit corridor elevating hazardous PM2.5 levels for 800 residential dwellings.",
      severityScore: 90,
      affectedPeopleScore: 75,
      frequencyScore: 95,
      evidenceScore: 90,
      urgencyScore: 85,
      aiUrgencyScore: 9,
      aiUrgencyReason: "Extreme particulate exposure poses immediate chronic obstructive pulmonary risk to school children and residents.",
      isDuplicate: false,
    },
  });

  // Problem 3: Stormwater Drainage / East Singhbhum (MEDIUM: 55.25 / GOVERNMENT_VERIFIED)
  // Severity=60, Affected=55, Frequency=40, Evidence=70, Urgency=50
  // Score: (60*0.25) + (55*0.25) + (40*0.15) + (70*0.15) + (50*0.20) = 15.0 + 13.75 + 6.0 + 10.5 + 10.0 = 55.25
  const problem3 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_3 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_3,
      title: "Chronic Monsoon Waterlogging at Bagbera Railway Colony Underpass",
      description: "Silt accumulation and inadequate culvert discharge capacity cause 4-foot water stagnation during moderate rains, cutting off vehicular transit for 450 daily commuters and preventing emergency vehicles from reaching Bagbera colony.",
      category: "Civic Infrastructure",
      subCategory: "Urban Drainage & Road Access",
      district: "East Singhbhum",
      locationText: "Bagbera Underpass, Jamshedpur",
      latitude: 22.7844,
      longitude: 86.1956,
      affectedCount: 450,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/bagbera_drainage_photo.jpg",
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Valid civic infrastructure blockage with clear geographic and seasonal impact.",
      priorityScore: 55.25,
      priorityTier: PriorityTier.MEDIUM,
      verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED,
      verificationNotes: "Confirmed by Jamshedpur Notified Area Committee (JNAC). De-siltation required before pre-monsoon showers.",
      verifiedAt: new Date("2026-03-03T14:00:00Z"),
      verifiedById: userAdmin.id,
      verificationRequested: true,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem3.id },
    update: {},
    create: {
      problemId: problem3.id,
      predictedCategory: "Civic Infrastructure",
      confidenceScore: 0.91,
      aiSummary: "Recurrent underpass flooding obstructing daily transit and ambulance access for 450 residents in Bagbera.",
      severityScore: 60,
      affectedPeopleScore: 55,
      frequencyScore: 40,
      evidenceScore: 70,
      urgencyScore: 50,
      aiUrgencyScore: 5,
      aiUrgencyReason: "Seasonal obstacle requiring structural silt-trap and pumping solution before peak monsoon.",
      isDuplicate: false,
    },
  });

  await prisma.validation.upsert({
    where: { problemId: problem3.id },
    update: {},
    create: {
      problemId: problem3.id,
      reviewedById: userAdmin.id,
      severityScore: 60,
      affectedScore: 55,
      frequencyScore: 40,
      evidenceScore: 70,
      urgencyScore: 50,
      decision: VerificationStatus.GOVERNMENT_VERIFIED,
      remarks: "Field visit completed with municipal engineer. Drain elevation re-alignment recommended.",
    },
  });

  // Problem 4: Irrigation Canal Sluice Gate / Hazaribagh (MEDIUM: 56.0 / AI_SCREENED)
  // Severity=65, Affected=45, Frequency=50, Evidence=60, Urgency=60
  // Score: (65*0.25) + (45*0.25) + (50*0.15) + (60*0.15) + (60*0.20) = 16.25 + 11.25 + 7.5 + 9.0 + 12.0 = 56.0
  const problem4 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_4 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_4,
      title: "Broken Sluice Gate Causing Silt Inundation in Ichak Branch Canal",
      description: "A damaged mechanical gear on the sub-branch canal sluice gate prevents water flow regulation, causing unseasonal inundation in 18 hectares of vegetable fields while starving downstream paddy plots of irrigation water.",
      category: "Agriculture & Irrigation",
      subCategory: "Canal & Water Flow Control",
      district: "Hazaribagh",
      locationText: "Ichak Canal Outlet No. 4, Ichak Block",
      latitude: 24.1124,
      longitude: 85.4056,
      affectedCount: 220,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/ichak_sluice_gate.jpg",
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Verifiable agricultural infrastructure fault impacting farmer livelihoods.",
      priorityScore: 56.0,
      priorityTier: PriorityTier.MEDIUM,
      verificationStatus: VerificationStatus.AI_SCREENED,
      verificationRequested: false,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem4.id },
    update: {},
    create: {
      problemId: problem4.id,
      predictedCategory: "Agriculture & Irrigation",
      confidenceScore: 0.89,
      aiSummary: "Faulty canal sluice mechanism causing localized field flooding and downstream water deprivation for 220 smallholder farmers.",
      severityScore: 65,
      affectedPeopleScore: 45,
      frequencyScore: 50,
      evidenceScore: 60,
      urgencyScore: 60,
      aiUrgencyScore: 6,
      aiUrgencyReason: "Crop damage risks escalate with each delayed irrigation cycle during sowing season.",
      isDuplicate: false,
    },
  });

  // Problem 5: Solar Streetlights / Bokaro (LOW: 35.75 / AI_SCREENED)
  // Severity=35, Affected=30, Frequency=40, Evidence=50, Urgency=30
  // Score: (35*0.25) + (30*0.25) + (40*0.15) + (50*0.15) + (30*0.20) = 8.75 + 7.5 + 6.0 + 7.5 + 6.0 = 35.75
  const problem5 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_5 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_5,
      title: "Faulty Battery Units on Solar Streetlights on Chas-Petarwar Rural Road",
      description: "Three solar streetlights installed outside the Chandankyari health sub-centre have non-functional lithium batteries, leaving a 200m approach lane unlit after 6:30 PM.",
      category: "Public Safety & Lighting",
      subCategory: "Rural Solar Lighting",
      district: "Bokaro",
      locationText: "Approach Road to Chandankyari Sub-Centre, Chas Block",
      latitude: 23.6341,
      longitude: 86.1789,
      affectedCount: 90,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/solar_battery_damage.jpg",
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Civic lighting issue with modest affected scope and clear remedy.",
      priorityScore: 35.75,
      priorityTier: PriorityTier.LOW,
      verificationStatus: VerificationStatus.AI_SCREENED,
      verificationRequested: false,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem5.id },
    update: {},
    create: {
      problemId: problem5.id,
      predictedCategory: "Public Safety & Lighting",
      confidenceScore: 0.93,
      aiSummary: "Non-operational solar battery units leaving hospital approach road unlit for approximately 90 night-time clinic visitors.",
      severityScore: 35,
      affectedPeopleScore: 30,
      frequencyScore: 40,
      evidenceScore: 50,
      urgencyScore: 30,
      aiUrgencyScore: 3,
      aiUrgencyReason: "Low physical hazard; standard component replacement required.",
      isDuplicate: false,
    },
  });

  // =========================================================================
  // 4. UNIVERSITY PROPOSAL (Attached to Problem 1 - Water Contamination)
  // =========================================================================
  console.log("  → Upserting University Proposal...");

  const proposal1 = await prisma.proposal.upsert({
    where: { id: SEED_IDS.PROPOSAL_1 },
    update: {},
    create: {
      id: SEED_IDS.PROPOSAL_1,
      problemId: problem1.id,
      universityId: orgUniversity.id,
      facultyMentor: "Dr. Ananya Mukhopadhyay, Department of Chemical & Environmental Engineering",
      teamMembers: [
        { name: "Rahul Verma", email: "rahul.v@bitmesra.ac.in", rollNo: "BTECH/CHE/2022/045", role: "Student Lead / Sensor Integration" },
        { name: "Pooja Kumari", email: "pooja.k@bitmesra.ac.in", rollNo: "BTECH/CHE/2022/078", role: "Filter Material Testing" },
        { name: "Alok Topno", email: "alok.t@bitmesra.ac.in", rollNo: "BTECH/CIV/2022/012", role: "Site Survey & Installation" },
      ],
      proposedApproach: "Deploy decentralized activated alumina and biochar multi-stage adsorption filter columns paired with an ESP32-based colorimetric IoT fluoride detector for continuous quality telemetry.",
      deliverables: "1. 3 Working decentralized pilot filtration columns with 500 L/hr capacity.\n2. IoT telemetry dashboard feeding real-time fluoride levels to CivicBridge.\n3. Community maintenance manual in Hindi and Mundari.",
      timelineStart: new Date("2026-03-15T00:00:00Z"),
      timelineEnd: new Date("2026-07-15T00:00:00Z"),
      milestones: [
        { title: "Lab scale media testing and water sample benchmarking", deadline: "2026-04-15", status: "COMPLETED" },
        { title: "Column casing fabrication and community site preparation", deadline: "2026-05-30", status: "IN_PROGRESS" },
        { title: "Pilot installation, telemetry validation, and community handover", deadline: "2026-07-15", status: "PENDING" },
      ],
      budgetRequired: 145000, // INR 1.45 Lakhs for raw materials & IoT sensors (no CSR funding requested)
      status: ProposalStatus.IN_PROGRESS,
    },
  });

  // Progress Update for Proposal (enforcing XOR: proposalId is populated, businessConceptId is NULL)
  await prisma.progressUpdate.upsert({
    where: { id: SEED_IDS.UPDATE_PROPOSAL },
    update: {},
    create: {
      id: SEED_IDS.UPDATE_PROPOSAL,
      proposalId: proposal1.id,
      businessConceptId: null,
      updateText: "Milestone 1 achieved: Benchmarked water samples from Nawagarh and Baredih. Activated alumina achieved 94.2% fluoride removal efficiency in benchtop trials.",
      milestoneTitle: "Lab scale media testing and water sample benchmarking",
      attachmentUrl: "https://storage.civicbridge.jharkhand.gov.in/updates/bit_lab_report_milestone1.pdf",
      postedById: userUniversity.id,
    },
  });

  // =========================================================================
  // 5. STARTUP BUSINESS CONCEPT (Attached to Problem 2 - Coal Dust Air Pollution)
  // =========================================================================
  console.log("  → Upserting Startup Business Concept...");

  const concept1 = await prisma.businessConcept.upsert({
    where: { id: SEED_IDS.CONCEPT_1 },
    update: {},
    create: {
      id: SEED_IDS.CONCEPT_1,
      problemId: problem2.id,
      startupId: orgStartup.id,
      solutionDescription: "Low-cost bio-surfactant misting cannons and solar-powered air filtration canopies installed along high-frequency coal transport corridors to suppress particulate dispersion at the point of transit.",
      targetBeneficiaries: "Over 800 households, roadside vendors, and school children residing within 150m of the Jharia-Sindri coal transport corridor.",
      marketSize: "Estimated 140km of industrial haul corridors across Dhanbad, Bokaro, and Ramgarh coal belts in Jharkhand.",
      businessModel: "B2B / B2G hardware sales and annual misting consumable service contracts with mining logistics operators and local municipal boards.",
      revenueModel: "Per-kilometer haul road dust suppression service fees and IoT compliance monitoring subscriptions.",
      sustainabilityModel: "Formulation uses biodegradable molasses-derived surfactant, avoiding toxic chemical runoff into local water bodies.",
      currentStage: VentureStage.CONCEPT_SUBMITTED,
    },
  });

  // Progress Update for Business Concept (enforcing XOR: businessConceptId is populated, proposalId is NULL)
  await prisma.progressUpdate.upsert({
    where: { id: SEED_IDS.UPDATE_CONCEPT },
    update: {},
    create: {
      id: SEED_IDS.UPDATE_CONCEPT,
      businessConceptId: concept1.id,
      proposalId: null,
      updateText: "Completed baseline field survey and nozzle pressure test with localized water mist atomizer at Bastacola crossing.",
      milestoneTitle: "Baseline Nozzle Pressure Test",
      postedById: userStartup.id,
    },
  });

  // =========================================================================
  // 6. INDUSTRY COLLABORATION (Tata Steel collaborating on Problem 1 - Water)
  // =========================================================================
  console.log("  → Upserting Industry Collaboration...");

  await prisma.collaboration.upsert({
    where: { id: SEED_IDS.COLLAB_1 },
    update: {},
    create: {
      id: SEED_IDS.COLLAB_1,
      problemId: problem1.id,
      industryId: orgIndustry.id,
      supportType: SupportType.TECHNICAL, // Strictly TECHNICAL / MENTORSHIP / PROTOTYPING / GENERAL_INTEREST
      message: "Tata Steel's Advanced Water Technology lab at Jamshedpur offers full spectrometry validation for the BIT Mesra team's filter effluent and technical mentoring on scaling column adsorption life.",
      status: CollaborationStatus.ACTIVE,
    },
  });

  console.log("✅ CivicBridge development seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
