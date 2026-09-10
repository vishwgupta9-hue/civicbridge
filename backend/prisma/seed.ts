import {
  PrismaClient,
  Role,
  OrganizationType,
  PriorityTier,
  VerificationStatus,
  ProblemStatus,
  FilterStatus,
  SupportType,
  VentureStage,
  ProposalStatus,
  CollaborationStatus,
  ProjectTrack,
  ProjectStatus,
  MilestoneStatus,
  OfferCategory,
  NeedUrgency,
  NeedStatus,
  PilotStatus,
  ClearanceStatus,
  VerificationFinding,
  EvidenceType,
} from "@prisma/client";
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
  PROBLEM_1: "f1111111-1111-4111-8111-111111111111", // Water / East Singhbhum & Ranchi / HIGH / GOVERNMENT_VERIFIED
  PROBLEM_2: "f2222222-2222-4222-8222-222222222222", // Coal Dust / Dhanbad / HIGH / AI_SCREENED
  PROBLEM_3: "f3333333-3333-4333-8333-333333333333", // Industrial Runoff / East Singhbhum / HIGH / GOVERNMENT_VERIFIED
  PROBLEM_4: "f4444444-4444-4444-8444-444444444444", // Canal Siltation / Hazaribagh / MEDIUM / GOVERNMENT_VERIFIED
  PROBLEM_5: "f5555555-5555-4555-8555-555555555555", // Solar PHC Outages / Bokaro / MEDIUM / AI_SCREENED

  // V3 Projects
  PROJ_WATER: "a1111111-aaaa-4aaa-aaaa-111111111111",
  PROJ_DUST: "a2222222-aaaa-4aaa-aaaa-222222222222",
  PROJ_CANAL: "a3333333-aaaa-4aaa-aaaa-333333333333",
  PROJ_SOLAR: "a4444444-aaaa-4aaa-aaaa-444444444444",

  // V3 Offers
  OFFER_SPECTROMETRY: "b1111111-bbbb-4bbb-bbbb-111111111111",
  OFFER_PROTOTYPING: "b2222222-bbbb-4bbb-bbbb-222222222222",
  OFFER_DRONE: "b3333333-bbbb-4bbb-bbbb-333333333333",
  OFFER_ELECTRICAL: "b4444444-bbbb-4bbb-bbbb-444444444444",

  // V3 Needs
  NEED_SPECTROMETRY: "c1111111-cccc-4ccc-cccc-111111111111",
  NEED_NOZZLES: "c2222222-cccc-4ccc-cccc-222222222222",
  NEED_DRONE: "c3333333-cccc-4ccc-cccc-333333333333",
  NEED_BATTERY_TEST: "c4444444-cccc-4ccc-cccc-444444444444",

  // V3 Collaborations
  COLLAB_WATER: "99999999-9999-4999-a999-999999999999",
  COLLAB_DUST: "98888888-9999-4999-a999-999999999999",

  // V3 Pilots
  PILOT_WATER: "d1111111-dddd-4ddd-dddd-111111111111",
  PILOT_DUST: "d2222222-dddd-4ddd-dddd-222222222222",

  // Legacy Children
  PROPOSAL_1: "77777777-7777-4777-a777-777777777777",
  CONCEPT_1: "88888888-8888-4888-a888-888888888888",
  UPDATE_PROPOSAL: "66666666-6666-4666-a666-666666666666",
  UPDATE_CONCEPT: "55555555-5555-4555-a555-555555555555",
  SUPPORT_REQ_1: "44444444-4444-4444-a444-444444444444",
};

// Documented development passwords
export const DEV_PASSWORDS = {
  CITIZEN: "CivicPass123!",
  ADMIN: "AdminPass123!",
  UNIVERSITY: "UniPass123!",
  INDUSTRY: "IndustryPass123!",
  STARTUP: "StartupPass123!",
};

const BCRYPT_SALT_ROUNDS = 12;

const DEV_HASHES = {
  CITIZEN: bcrypt.hashSync(DEV_PASSWORDS.CITIZEN, BCRYPT_SALT_ROUNDS),
  ADMIN: bcrypt.hashSync(DEV_PASSWORDS.ADMIN, BCRYPT_SALT_ROUNDS),
  UNIVERSITY: bcrypt.hashSync(DEV_PASSWORDS.UNIVERSITY, BCRYPT_SALT_ROUNDS),
  INDUSTRY: bcrypt.hashSync(DEV_PASSWORDS.INDUSTRY, BCRYPT_SALT_ROUNDS),
  STARTUP: bcrypt.hashSync(DEV_PASSWORDS.STARTUP, BCRYPT_SALT_ROUNDS),
};

async function main() {
  console.log("🌱 Starting CivicBridge Connected V3 Seed Ecosystem...");

  // =========================================================================
  // 1. ORGANIZATIONS
  // =========================================================================
  console.log("  → Upserting Organizations...");

  const orgUniversity = await prisma.organization.upsert({
    where: { id: SEED_IDS.ORG_UNIVERSITY },
    update: {
      name: "Birla Institute of Technology (BIT) Mesra",
      domainTags: ["Environmental Engineering", "IoT & Sensing", "Civil Works", "Water Purification"],
      expertiseTags: ["Water Quality Analysis", "Embedded Systems", "GIS Mapping", "Adsorption Columns"],
    },
    create: {
      id: SEED_IDS.ORG_UNIVERSITY,
      name: "Birla Institute of Technology (BIT) Mesra",
      type: OrganizationType.UNIVERSITY,
      regCode: "AICTE-JH-00123",
      domainTags: ["Environmental Engineering", "IoT & Sensing", "Civil Works", "Water Purification"],
      expertiseTags: ["Water Quality Analysis", "Embedded Systems", "GIS Mapping", "Adsorption Columns"],
      district: "Ranchi",
      state: "Jharkhand",
      contactEmail: "rnd@bitmesra.ac.in",
      contactPhone: "+91-651-2275444",
    },
  });

  const orgIndustry = await prisma.organization.upsert({
    where: { id: SEED_IDS.ORG_INDUSTRY },
    update: {
      name: "Tata Steel CSR & Sustainability Division",
      domainTags: ["Clean Tech", "Rural Infrastructure", "Industrial Waste", "Environmental Testing"],
      expertiseTags: ["Prototyping Labs", "Pilot Testing Facilities", "Mentorship", "Spectrometry Analysis"],
    },
    create: {
      id: SEED_IDS.ORG_INDUSTRY,
      name: "Tata Steel CSR & Sustainability Division",
      type: OrganizationType.INDUSTRY,
      regCode: "CIN-L27100MH1907PLC000260",
      domainTags: ["Clean Tech", "Rural Infrastructure", "Industrial Waste", "Environmental Testing"],
      expertiseTags: ["Prototyping Labs", "Pilot Testing Facilities", "Mentorship", "Spectrometry Analysis"],
      district: "East Singhbhum",
      state: "Jharkhand",
      contactEmail: "sustainability@tatasteel.com",
      contactPhone: "+91-657-2431234",
    },
  });

  const orgStartup = await prisma.organization.upsert({
    where: { id: SEED_IDS.ORG_STARTUP },
    update: {
      name: "JharJal CleanTech Innovations Pvt Ltd",
      domainTags: ["Clean Drinking Water", "Affordable Filtration", "IoT Monitoring", "Dust Suppression"],
      expertiseTags: ["Adsorption Technology", "Low-Cost Sensors", "Community Distribution", "Fog Cannons"],
    },
    create: {
      id: SEED_IDS.ORG_STARTUP,
      name: "JharJal CleanTech Innovations Pvt Ltd",
      type: OrganizationType.STARTUP,
      regCode: "DPIIT-JH-2024-8891",
      domainTags: ["Clean Drinking Water", "Affordable Filtration", "IoT Monitoring", "Dust Suppression"],
      expertiseTags: ["Adsorption Technology", "Low-Cost Sensors", "Community Distribution", "Fog Cannons"],
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
      district: "East Singhbhum",
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
    update: { passwordHash: DEV_HASHES.UNIVERSITY, organizationId: orgUniversity.id },
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
    update: { passwordHash: DEV_HASHES.INDUSTRY, organizationId: orgIndustry.id },
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
    update: { passwordHash: DEV_HASHES.STARTUP, organizationId: orgStartup.id },
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
  // 3. CIVIC PROBLEMS & AI SCREENING
  // =========================================================================
  console.log("  → Upserting 5 Civic Problems...");

  // Problem 1: Water Contamination / East Singhbhum (HIGH / GOVERNMENT_VERIFIED)
  const problem1Data = {
    title: "Severe Chemical Runoff and Toxic Water Discoloration in Subarnarekha Tributary",
    description: "Community drinking water handpumps across 4 villages in Potka block are dispensing water with fluoride levels exceeding 3.5 mg/L and heavy metal leaching. Over 1,500 villagers and school children report joint pain, dental fluorosis, and gastrointestinal symptoms. Urgent filtration and decentralized water monitoring needed.",
    category: "Water & Sanitation",
    subCategory: "Drinking Water Contamination",
    district: "East Singhbhum",
    locationText: "Potka Block, Villages: Baredih, Nawagarh, Rajaulatu",
    latitude: 22.6186,
    longitude: 86.2238,
    affectedCount: 1500,
    evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/e_singhbhum_water_test_2026.pdf",
    status: ProblemStatus.IN_PROGRESS,
    filterStatus: FilterStatus.PASSED,
    filterReason: "Severe environmental and public health crisis confirmed by initial testing.",
    priorityScore: 88.0,
    priorityTier: PriorityTier.HIGH,
    verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED,
    verificationNotes: "Verified on-site by Potka BDO and District PHED team. Chemical analysis confirms hazardous fluoride and heavy metal levels.",
    verifiedAt: new Date("2026-03-01T10:30:00Z"),
    verifiedById: userAdmin.id,
    verificationRequested: true,
    submittedById: userCitizen.id,
  };

  const problem1 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_1 },
    update: problem1Data,
    create: {
      id: SEED_IDS.PROBLEM_1,
      ...problem1Data,
    },
  });

  const aiAnalysis1Data = {
    predictedCategory: "Water & Sanitation",
    confidenceScore: 0.96,
    aiSummary: "High-priority groundwater fluoride and heavy metal contamination across Potka villages causing acute fluorosis among ~1,500 residents.",
    severityScore: 90,
    affectedPeopleScore: 85,
    frequencyScore: 90,
    evidenceScore: 88,
    urgencyScore: 85,
    aiUrgencyScore: 9,
    aiUrgencyReason: "Toxic effluent directly ingested by rural population with zero alternative water source.",
    rootCauseHypotheses: [
      "Unlined industrial settling pond seepage into shallow aquifers.",
      "Geogenic bedrock fluoride leaching accelerated by deep drilling.",
      "Absence of community-level activated alumina filtration systems."
    ],
    requiredExpertise: ["Environmental Engineering", "Water Adsorption Media", "Colorimetric IoT Telemetry"],
    departmentHints: ["Drinking Water & Sanitation Department (DWSD)", "Public Health Engineering Department (PHED)"],
  };

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem1.id },
    update: aiAnalysis1Data,
    create: {
      problemId: problem1.id,
      ...aiAnalysis1Data,
    },
  });

  // Problem 2: Fugitive Coal Dust / Dhanbad (HIGH / AI_SCREENED)
  const problem2 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_2 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_2,
      title: "Severe Fugitive Coal Dust and Particulate Pollution along Haulage Corridor",
      description: "Over 2,400 residents, school children, and roadside vendors along the Jharia-Sindri coal transport corridor are exposed to PM10 levels exceeding 380 ug/m3. Uncovered coal dumpers generate intense dust clouds throughout day and night. Acute respiratory distress and asthma cases reported.",
      category: "Environment & Forest",
      subCategory: "Air Quality Degradation",
      district: "Dhanbad",
      locationText: "Jharia-Sindri Main Road, Bastacola Crossing",
      latitude: 23.7523,
      longitude: 86.4258,
      affectedCount: 2400,
      evidenceUrl: "https://storage.civicbridge.jharkhand.gov.in/evidence/dhanbad_pm10_sensor_data.pdf",
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Severe continuous particulate exposure affecting dense residential settlements.",
      priorityScore: 82.0,
      priorityTier: PriorityTier.HIGH,
      verificationStatus: VerificationStatus.AI_SCREENED,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem2.id },
    update: {},
    create: {
      problemId: problem2.id,
      predictedCategory: "Environment & Forest",
      confidenceScore: 0.94,
      aiSummary: "Continuous hazardous PM10 coal dust dispersion along 12km haul road affecting 2,400 residents.",
      severityScore: 85,
      affectedPeopleScore: 88,
      frequencyScore: 92,
      evidenceScore: 78,
      urgencyScore: 75,
      aiUrgencyScore: 8,
      aiUrgencyReason: "High respiratory morbidity among children and school students along the transit corridor.",
      rootCauseHypotheses: [
        "Uncovered haulage trucks transporting dry coal.",
        "Lack of continuous boundary mist cannons at transit checkpoints.",
        "Absence of biodegradable dust binding spray on road shoulders."
      ],
      requiredExpertise: ["Aerosol Fluid Dynamics", "Industrial Fogging Systems", "Air Quality Telemetry"],
      departmentHints: ["Jharkhand State Pollution Control Board (JSPCB)", "Mines & Geology Department"],
    },
  });

  // Problem 4: Canal Siltation & Tail-End Irrigation / Hazaribagh (MEDIUM / GOVERNMENT_VERIFIED)
  const problem4 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_4 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_4,
      title: "Critical Canal Breach and Tail-End Siltation Depriving Katkamsandi Farms",
      description: "The Konar Left Bank distribution canal in Katkamsandi block has suffered extensive silt accumulation and a broken regulator gate. Water does not reach tail-end farmers in 3 panchayats, resulting in drought distress across 950 smallholder farming families.",
      category: "Agriculture & Rural Development",
      subCategory: "Irrigation Infrastructure",
      district: "Hazaribagh",
      locationText: "Katkamsandi Block, Canal RD 14.5 to 22.0",
      latitude: 24.0542,
      longitude: 85.2719,
      affectedCount: 950,
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Authentic agricultural infrastructure failure directly endangering smallholder food security.",
      priorityScore: 65.0,
      priorityTier: PriorityTier.MEDIUM,
      verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED,
      verificationNotes: "Inspected by Assistant Engineer, Minor Irrigation Division Hazaribagh. Silt depth benchmarked at 1.4 meters.",
      verifiedAt: new Date("2026-03-05T14:00:00Z"),
      verifiedById: userAdmin.id,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem4.id },
    update: {},
    create: {
      problemId: problem4.id,
      predictedCategory: "Agriculture & Rural Development",
      confidenceScore: 0.91,
      aiSummary: "Irrigation delivery blocked to 950 farming households due to canal bed sedimentation and manual sluice control failure.",
      severityScore: 65,
      affectedPeopleScore: 70,
      frequencyScore: 60,
      evidenceScore: 72,
      urgencyScore: 65,
      aiUrgencyScore: 6,
      aiUrgencyReason: "Kharif crop planting window approaching within 60 days.",
      rootCauseHypotheses: [
        "Upstream catchment soil erosion washing silt into canal bed.",
        "Manual sluice gate rusted shut causing headwater overflow.",
        "Lack of real-time flow telemetry to detect tail-end drying."
      ],
      requiredExpertise: ["Hydraulic Engineering", "Bathymetry & Drone GIS", "Automated Sluice Controls"],
      departmentHints: ["Water Resources Department", "Agriculture Department"],
    },
  });

  // Problem 5: Solar PHC Outages / Bokaro (MEDIUM / AI_SCREENED)
  const problem5 = await prisma.problem.upsert({
    where: { id: SEED_IDS.PROBLEM_5 },
    update: {},
    create: {
      id: SEED_IDS.PROBLEM_5,
      title: "Frequent Battery Inverter Failures at Chandankiyari Primary Health Centre",
      description: "The 10 kW rooftop solar microgrid at Chandankiyari PHC suffers from rapid battery bank overheating and inverter trip-offs. Vaccine cold chain refrigerators and emergency maternal delivery rooms face frequent blackouts during hot afternoons.",
      category: "Public Health & Sanitation",
      subCategory: "Healthcare Energy Reliability",
      district: "Bokaro",
      locationText: "Chandankiyari Block PHC, Main Hospital Compound",
      latitude: 23.5742,
      longitude: 86.3489,
      affectedCount: 650,
      status: ProblemStatus.OPEN,
      filterStatus: FilterStatus.PASSED,
      filterReason: "Critical rural healthcare facility power failure affecting immunization cold storage.",
      priorityScore: 58.0,
      priorityTier: PriorityTier.MEDIUM,
      verificationStatus: VerificationStatus.AI_SCREENED,
      submittedById: userCitizen.id,
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { problemId: problem5.id },
    update: {},
    create: {
      problemId: problem5.id,
      predictedCategory: "Public Health & Sanitation",
      confidenceScore: 0.89,
      aiSummary: "Thermal degradation and unmonitored BMS failures causing vaccine cold-chain disruption at rural PHC.",
      severityScore: 60,
      affectedPeopleScore: 55,
      frequencyScore: 65,
      evidenceScore: 55,
      urgencyScore: 55,
      aiUrgencyScore: 6,
      aiUrgencyReason: "Vaccine batches risk spoilage if cold storage temperature exceeds 8 degrees Celsius.",
      rootCauseHypotheses: [
        "Lead-acid battery cell imbalance and lack of thermal management.",
        "Absence of remote cellular IoT inverter monitoring."
      ],
      requiredExpertise: ["Renewable Energy Systems", "Battery Management (BMS)", "Thermal Telemetry"],
      departmentHints: ["Health, Medical Education & Family Welfare", "JREDA"],
    },
  });

  // =========================================================================
  // 4. V3 CAPABILITY OFFERS (Resource Exchange)
  // =========================================================================
  console.log("  → Upserting Capability & Resource Offers...");

  const offerSpectrometry = await prisma.offer.upsert({
    where: { id: SEED_IDS.OFFER_SPECTROMETRY },
    update: {},
    create: {
      id: SEED_IDS.OFFER_SPECTROMETRY,
      providerOrgId: orgIndustry.id,
      category: OfferCategory.TESTING_ANALYSIS,
      title: "Advanced Environmental Testing & Spectrometry Facility",
      specifications: "Inductively Coupled Plasma Mass Spectrometry (ICP-MS), atomic absorption spectrometer (AAS), and accredited water toxicity assay laboratory available for civic university and startup projects across Jharkhand.",
      district: "East Singhbhum",
      capacityTerms: "Supports up to 5 pilot project sample batches per quarter. Samples processed within 72 hours.",
      status: "ACTIVE",
    },
  });

  const offerPrototyping = await prisma.offer.upsert({
    where: { id: SEED_IDS.OFFER_PROTOTYPING },
    update: {},
    create: {
      id: SEED_IDS.OFFER_PROTOTYPING,
      providerOrgId: orgIndustry.id,
      category: OfferCategory.MANUFACTURING_FABRICATION,
      title: "Industrial Prototyping & Flow Bench Testing Workshop",
      specifications: "CNC machining, precision laser cutting, fluidics test rig, and nozzle atomization spray bench for mechanical dust suppression and water treatment hardware.",
      district: "East Singhbhum",
      capacityTerms: "Available for certified student startups and R&D research prototypes.",
      status: "ACTIVE",
    },
  });

  const offerDrone = await prisma.offer.upsert({
    where: { id: SEED_IDS.OFFER_DRONE },
    update: {},
    create: {
      id: SEED_IDS.OFFER_DRONE,
      providerOrgId: orgUniversity.id,
      category: OfferCategory.FACILITY_SITE_ACCESS,
      title: "Geospatial Survey Drones & Bathymetry Sonar Kit",
      specifications: "RTK-enabled survey drone with multispectral sensor, paired with lightweight remote acoustic bathymetry sonar for canal and reservoir silt depth profiling.",
      district: "Ranchi",
      capacityTerms: "Faculty-led field operations available on weekends and academic breaks.",
      status: "ACTIVE",
    },
  });

  const offerElectrical = await prisma.offer.upsert({
    where: { id: SEED_IDS.OFFER_ELECTRICAL },
    update: {},
    create: {
      id: SEED_IDS.OFFER_ELECTRICAL,
      providerOrgId: orgUniversity.id,
      category: OfferCategory.LAB_EQUIPMENT,
      title: "Power Quality Analyzers & Solar Inverter Test Bench",
      specifications: "Fluke 435 Series II power quality analyzer, programmable DC electronic load (150V/60A), and battery impedance tester for microgrid diagnostics.",
      district: "Ranchi",
      capacityTerms: "Bench testing available on appointment at Department of Electrical & Electronics Engineering.",
      status: "ACTIVE",
    },
  });

  // =========================================================================
  // 5. V3 SOLUTION PROJECTS
  // =========================================================================
  console.log("  → Upserting V3 Solution Projects...");

  // Project 1: Water Project (BIT Mesra, ACADEMIC_RESEARCH)
  const projWater = await prisma.project.upsert({
    where: { id: SEED_IDS.PROJ_WATER },
    update: {},
    create: {
      id: SEED_IDS.PROJ_WATER,
      title: "Decentralized Heavy Metal Bio-Adsorption & IoT Quality Monitoring",
      executiveSummary: "Multi-stage decentralized filtration system combining acid-activated alumina, biochar from local agricultural biomass, and ESP32 colorimetric fluoride telemetry. Designed to treat high-fluoride and heavy-metal water directly at village community borewells without requiring grid electricity.",
      technicalApproach: "Pre-filtration through graded silica gravel bed followed by dual activated alumina columns (contact time: 14 mins). Post-polishing via bamboo biochar adsorption. Real-time photometric fluoride sensor logs telemetry via 4G-LTE to the CivicBridge statewide platform.",
      trackType: ProjectTrack.ACADEMIC_RESEARCH,
      status: ProjectStatus.PILOTING,
      leadOrgId: orgUniversity.id,
      trackMetadata: {
        facultyMentor: "Dr. Ananya Mukhopadhyay (Dept. of Chemical & Environmental Engineering)",
        department: "Chemical & Environmental Engineering",
        teamMembers: [
          { name: "Rahul Verma", role: "Student Lead / IoT Sensor Integration", rollNo: "BTECH/CHE/2022/045" },
          { name: "Pooja Kumari", role: "Filter Material Testing & Characterization", rollNo: "BTECH/CHE/2022/078" },
          { name: "Alok Topno", role: "Site Survey & Community Handover", rollNo: "BTECH/CIV/2022/012" }
        ],
        deliverables: [
          "3 Decentralized pilot filtration columns with 500 L/hr capacity",
          "IoT telemetry dashboard feeding real-time fluoride levels",
          "Community maintenance manual in Hindi and Mundari"
        ]
      },
      problems: {
        create: [
          { problemId: problem1.id, isPrimary: true }
        ]
      }
    },
  });

  // Project 2: Coal Dust Suppression (JharJal CleanTech, COMMERCIAL_VENTURE)
  const projDust = await prisma.project.upsert({
    where: { id: SEED_IDS.PROJ_DUST },
    update: {},
    create: {
      id: SEED_IDS.PROJ_DUST,
      title: "Solar-Powered Misting Cannons & Biodegradable Dust Binding",
      executiveSummary: "Autonomous solar-powered high-pressure misting cannons utilizing biodegradable molasses-derived surfactant to encapsulate and settle airborne PM10 coal particles along mining haul corridors in Dhanbad.",
      technicalApproach: "Stainless steel multi-orifice atomizing nozzles delivering 15-30 micron water droplets that match coal dust particle size. Solar inverter battery storage powers a 2.2 kW high-pressure mist pump triggered by optical dust sensor thresholds.",
      trackType: ProjectTrack.COMMERCIAL_VENTURE,
      status: ProjectStatus.BUILDING,
      leadOrgId: orgStartup.id,
      trackMetadata: {
        businessModel: "B2G / B2B service contracts with mining logistics operators and local municipal boards",
        targetBeneficiaries: "Over 2,400 households and school students along Jharia-Sindri transit corridor",
        revenueModel: "Per-kilometer haul road dust suppression service fees and IoT compliance monitoring subscriptions"
      },
      problems: {
        create: [
          { problemId: problem2.id, isPrimary: true }
        ]
      }
    },
  });

  // Project 3: Canal Siltation (BIT Mesra, CIVIC_INITIATIVE)
  const projCanal = await prisma.project.upsert({
    where: { id: SEED_IDS.PROJ_CANAL },
    update: {},
    create: {
      id: SEED_IDS.PROJ_CANAL,
      title: "Siltation Bathymetry & Solar Automated Sluice Gate Control",
      executiveSummary: "Rapid drone topographic survey and acoustic bathymetry to map silt bottlenecks along the Konar canal, followed by retrofit installation of solar motorized screw-actuator sluice gates.",
      technicalApproach: "UAV photogrammetric elevation mapping coupled with low-cost sonar transects to calculate desiltation earthwork volume. Solar automated actuators regulate tail-end discharge based on ultrasonic water level gauges.",
      trackType: ProjectTrack.CIVIC_INITIATIVE,
      status: ProjectStatus.PLANNING,
      leadOrgId: orgUniversity.id,
      trackMetadata: {
        facultyMentor: "Dr. B. K. Singh (Dept. of Civil & Environmental Engineering)",
        department: "Civil Engineering"
      },
      problems: {
        create: [
          { problemId: problem4.id, isPrimary: true }
        ]
      }
    },
  });

  // Explicitly guarantee ProjectProblem links exist
  await prisma.projectProblem.upsert({
    where: {
      projectId_problemId: {
        projectId: projWater.id,
        problemId: problem1.id,
      },
    },
    update: { isPrimary: true },
    create: {
      projectId: projWater.id,
      problemId: problem1.id,
      isPrimary: true,
    },
  });

  await prisma.projectProblem.upsert({
    where: {
      projectId_problemId: {
        projectId: projDust.id,
        problemId: problem2.id,
      },
    },
    update: { isPrimary: true },
    create: {
      projectId: projDust.id,
      problemId: problem2.id,
      isPrimary: true,
    },
  });

  await prisma.projectProblem.upsert({
    where: {
      projectId_problemId: {
        projectId: projCanal.id,
        problemId: problem4.id,
      },
    },
    update: { isPrimary: true },
    create: {
      projectId: projCanal.id,
      problemId: problem4.id,
      isPrimary: true,
    },
  });

  // =========================================================================
  // 6. V3 RESOURCE NEEDS
  // =========================================================================
  console.log("  → Upserting Project Resource Needs...");

  const needSpectrometry = await prisma.need.upsert({
    where: { id: SEED_IDS.NEED_SPECTROMETRY },
    update: {},
    create: {
      id: SEED_IDS.NEED_SPECTROMETRY,
      creatorOrgId: orgUniversity.id,
      projectId: projWater.id,
      category: OfferCategory.TESTING_ANALYSIS,
      title: "ICP-MS Spectrometry & Heavy Metal Water Testing",
      details: "Accredited spectrometry analysis for 45 raw and treated borehole effluent samples benchmarked against BIS IS-10500 drinking water standards.",
      district: "East Singhbhum",
      urgency: NeedUrgency.CRITICAL_PATH,
      status: NeedStatus.COMMITTED,
    },
  });

  const needNozzles = await prisma.need.upsert({
    where: { id: SEED_IDS.NEED_NOZZLES },
    update: {},
    create: {
      id: SEED_IDS.NEED_NOZZLES,
      creatorOrgId: orgStartup.id,
      projectId: projDust.id,
      category: OfferCategory.HARDWARE_COMPONENTS,
      title: "High-Pressure Stainless Steel Atomizing Nozzles",
      details: "Precision 0.3mm ceramic-orifice anti-drip atomizing nozzles rated for 70 bar fluidic pressure to ensure consistent 20-micron misting.",
      district: "Dhanbad",
      urgency: NeedUrgency.STANDARD,
      status: NeedStatus.COMMITTED,
    },
  });

  const needDrone = await prisma.need.upsert({
    where: { id: SEED_IDS.NEED_DRONE },
    update: {},
    create: {
      id: SEED_IDS.NEED_DRONE,
      creatorOrgId: orgUniversity.id,
      projectId: projCanal.id,
      category: OfferCategory.FACILITY_SITE_ACCESS,
      title: "Canal Alignment Drone GIS Topographic Survey",
      details: "High-resolution digital surface model (DSM) survey over 7.5 km canal reach to calculate dredge sediment volume.",
      district: "Hazaribagh",
      urgency: NeedUrgency.STANDARD,
      status: NeedStatus.OPEN,
    },
  });

  // =========================================================================
  // 7. V3 STRUCTURED COLLABORATIONS
  // =========================================================================
  console.log("  → Upserting Bilateral Collaborations...");

  const collabWaterData = {
    needId: needSpectrometry.id,
    offerId: offerSpectrometry.id,
    providerOrgId: orgIndustry.id,
    recipientOrgId: orgUniversity.id,
    projectId: projWater.id,
    problemId: problem1.id,
    industryId: orgIndustry.id,
    supportType: SupportType.TECHNICAL,
    contributionScope: "Tata Steel Advanced Water Technology lab at Jamshedpur provides full ICP-MS spectrometry validation for BIT Mesra filter effluent and technical mentoring on scaling column adsorption life.",
    expectedCompletionDate: new Date("2026-06-30T00:00:00Z"),
    status: CollaborationStatus.IN_PROGRESS,
    message: "Tata Steel Advanced Water Technology lab at Jamshedpur provides full ICP-MS spectrometry validation.",
  };

  const collabWater = await prisma.collaboration.upsert({
    where: { id: SEED_IDS.COLLAB_WATER },
    update: collabWaterData,
    create: {
      id: SEED_IDS.COLLAB_WATER,
      ...collabWaterData,
    },
  });

  const collabDustData = {
    needId: needNozzles.id,
    offerId: offerPrototyping.id,
    providerOrgId: orgIndustry.id,
    recipientOrgId: orgStartup.id,
    projectId: projDust.id,
    problemId: problem2.id,
    industryId: orgIndustry.id,
    supportType: SupportType.PROTOTYPING,
    contributionScope: "Tata Steel Engineering workshop provides spray pattern droplet testing and CNC machining of nozzle manifolds for JharJal's misting cannons.",
    expectedCompletionDate: new Date("2026-05-15T00:00:00Z"),
    status: CollaborationStatus.ACCEPTED,
    message: "Tata Steel Engineering workshop provides spray pattern droplet testing and CNC machining.",
  };

  const collabDust = await prisma.collaboration.upsert({
    where: { id: SEED_IDS.COLLAB_DUST },
    update: collabDustData,
    create: {
      id: SEED_IDS.COLLAB_DUST,
      ...collabDustData,
    },
  });

  // =========================================================================
  // 8. V3 PROJECT MILESTONES
  // =========================================================================
  console.log("  → Upserting Project Milestones...");

  await prisma.milestone.upsert({
    where: { id: "m1111111-1111-4111-aaaa-111111111111" },
    update: {},
    create: {
      id: "m1111111-1111-4111-aaaa-111111111111",
      projectId: projWater.id,
      collaborationId: collabWater.id,
      title: "Lab scale media testing and water sample benchmarking",
      description: "Sample benchmarking from Potka borewells; benchtop adsorption column validation.",
      responsibleParty: "BIT Mesra Chemical Engg Dept",
      targetDate: new Date("2026-04-15T00:00:00Z"),
      status: MilestoneStatus.VERIFIED,
      deliverableUrl: "https://storage.civicbridge.jharkhand.gov.in/updates/bit_lab_report_milestone1.pdf",
      verifiedByOrgId: orgIndustry.id,
      verifiedAt: new Date("2026-04-16T12:00:00Z"),
    },
  });

  await prisma.milestone.upsert({
    where: { id: "m2222222-2222-4222-aaaa-222222222222" },
    update: {},
    create: {
      id: "m2222222-2222-4222-aaaa-222222222222",
      projectId: projWater.id,
      collaborationId: collabWater.id,
      title: "Column casing fabrication and community site preparation",
      description: "Fabrication of 3 food-grade stainless steel adsorption columns and civil platform at Baredih community borewell.",
      responsibleParty: "BIT Mesra Civil / Tata Steel CSR",
      targetDate: new Date("2026-05-30T00:00:00Z"),
      status: MilestoneStatus.VERIFIED,
      verifiedByOrgId: orgIndustry.id,
      verifiedAt: new Date("2026-05-31T15:00:00Z"),
    },
  });

  await prisma.milestone.upsert({
    where: { id: "m3333333-3333-4333-aaaa-333333333333" },
    update: {},
    create: {
      id: "m3333333-3333-4333-aaaa-333333333333",
      projectId: projWater.id,
      collaborationId: collabWater.id,
      title: "Pilot installation, telemetry validation, and community handover",
      description: "Field installation of columns with solar-powered continuous fluoride sensor and community water committee orientation.",
      responsibleParty: "Joint University-Industry Team",
      targetDate: new Date("2026-07-15T00:00:00Z"),
      status: MilestoneStatus.IN_PROGRESS,
    },
  });

  // =========================================================================
  // 9. V3 FIELD PILOTS & GOVERNMENT CLEARANCE (NOC)
  // =========================================================================
  console.log("  → Upserting Field Pilots...");

  const pilotWaterData = {
    projectId: projWater.id,
    problemId: problem1.id,
    responsibleOrgId: orgUniversity.id,
    title: "Baredih Community Borewell Water Purification Pilot",
    description: "Decentralized field testbed purifying 4,500 liters of drinking water per day for 1,500 villagers in Potka Block, East Singhbhum.",
    risksRequirements: "Requires official clearance from District Administration and PHED. Safe disposal protocol for spent activated alumina backwash required.",
    siteLocation: "Community Borewell No. 3, Baredih Village, Potka Block",
    district: "East Singhbhum",
    latitude: 22.6186,
    longitude: 86.2238,
    targetBeneficiaryCount: 1500,
    actualBeneficiaryCount: 1420,
    startDate: new Date("2026-05-01T00:00:00Z"),
    endDate: new Date("2026-08-31T00:00:00Z"),
    actualStartDate: new Date("2026-05-10T00:00:00Z"),
    clearanceStatus: ClearanceStatus.GRANTED,
    clearanceDocumentUrl: "https://storage.civicbridge.jharkhand.gov.in/clearance/dc_office_noc_potka_water_2026.pdf",
    clearanceNotes: "Administrative NOC granted by Deputy Commissioner Office East Singhbhum under Swachh Bharat Mission (Grameen) convergence.",
    clearanceRequestedAt: new Date("2026-04-18T10:00:00Z"),
    clearanceDecidedAt: new Date("2026-04-25T14:30:00Z"),
    clearedById: userAdmin.id,
    status: PilotStatus.ACTIVE_ON_GROUND,
  };

  const pilotWater = await prisma.pilotDeployment.upsert({
    where: { id: SEED_IDS.PILOT_WATER },
    update: pilotWaterData,
    create: {
      id: SEED_IDS.PILOT_WATER,
      ...pilotWaterData,
    },
  });

  const pilotDust = await prisma.pilotDeployment.upsert({
    where: { id: SEED_IDS.PILOT_DUST },
    update: {},
    create: {
      id: SEED_IDS.PILOT_DUST,
      projectId: projDust.id,
      problemId: problem2.id,
      responsibleOrgId: orgStartup.id,
      title: "Bastacola Haul Junction Dust Suppression Pilot",
      description: "Field demonstration of 2 high-pressure autonomous misting cannons covering 400 meters of industrial haul corridor.",
      risksRequirements: "Traffic police coordination required during installation. Surface drainage must be inspected to prevent sludge buildup.",
      siteLocation: "Bastacola Crossing, Jharia-Sindri Haul Road",
      district: "Dhanbad",
      latitude: 23.7523,
      longitude: 86.4258,
      targetBeneficiaryCount: 2400,
      startDate: new Date("2026-06-01T00:00:00Z"),
      endDate: new Date("2026-09-30T00:00:00Z"),
      clearanceStatus: ClearanceStatus.REQUESTED,
      clearanceNotes: "NOC requested from Dhanbad District Administration and JSPCB Regional Office.",
      clearanceRequestedAt: new Date("2026-04-28T11:00:00Z"),
      status: PilotStatus.PREPARATION,
    },
  });

  // =========================================================================
  // 10. V3 QUANTITATIVE METRICS (Baseline vs Outcome)
  // =========================================================================
  console.log("  → Upserting Empirical Pilot Metrics...");

  await prisma.pilotMetric.upsert({
    where: { id: "met11111-1111-4111-aaaa-111111111111" },
    update: {},
    create: {
      id: "met11111-1111-4111-aaaa-111111111111",
      pilotId: pilotWater.id,
      metricName: "Fluoride Concentration",
      unit: "mg/L",
      baselineValue: 3.5,
      targetValue: 1.0,
      outcomeValue: 0.82,
      status: "VERIFIED",
      recordedById: userUniversity.id,
      verifiedById: userIndustry.id,
      verifiedAt: new Date("2026-05-20T11:00:00Z"),
    },
  });

  await prisma.pilotMetric.upsert({
    where: { id: "met22222-2222-4222-aaaa-222222222222" },
    update: {},
    create: {
      id: "met22222-2222-4222-aaaa-222222222222",
      pilotId: pilotWater.id,
      metricName: "Heavy Metal Toxicity Index",
      unit: "mg/L",
      baselineValue: 2.4,
      targetValue: 0.05,
      outcomeValue: 0.038,
      status: "VERIFIED",
      recordedById: userUniversity.id,
      verifiedById: userIndustry.id,
      verifiedAt: new Date("2026-05-20T11:30:00Z"),
    },
  });

  await prisma.pilotMetric.upsert({
    where: { id: "met33333-3333-4333-aaaa-333333333333" },
    update: {},
    create: {
      id: "met33333-3333-4333-aaaa-333333333333",
      pilotId: pilotWater.id,
      metricName: "Daily Clean Potable Water Output",
      unit: "Liters / Day",
      baselineValue: 0,
      targetValue: 4000,
      outcomeValue: 4350,
      status: "REPORTED",
      recordedById: userUniversity.id,
    },
  });

  // =========================================================================
  // 11. V3 MULTI-STAKEHOLDER GROUND-TRUTH VERIFICATIONS
  // =========================================================================
  console.log("  → Upserting Multi-Stakeholder Verifications...");

  await prisma.pilotVerification.upsert({
    where: { id: "ver11111-1111-4111-aaaa-111111111111" },
    update: {},
    create: {
      id: "ver11111-1111-4111-aaaa-111111111111",
      pilotId: pilotWater.id,
      verifierId: userUniversity.id,
      verificationRole: Role.UNIVERSITY,
      organizationId: orgUniversity.id,
      finding: VerificationFinding.SUCCESS_CONFIRMED,
      evidenceType: EvidenceType.LAB_REPORT,
      feedbackText: "Continuous colorimetric telemetry and university lab testing confirm fluoride reduced from 3.5 mg/L to 0.82 mg/L, comfortably below the Indian National Standard (BIS IS-10500 limit: 1.0 mg/L).",
    },
  });

  await prisma.pilotVerification.upsert({
    where: { id: "ver22222-2222-4222-aaaa-222222222222" },
    update: {},
    create: {
      id: "ver22222-2222-4222-aaaa-222222222222",
      pilotId: pilotWater.id,
      verifierId: userIndustry.id,
      verificationRole: Role.INDUSTRY,
      organizationId: orgIndustry.id,
      finding: VerificationFinding.SUCCESS_CONFIRMED,
      evidenceType: EvidenceType.LAB_REPORT,
      feedbackText: "Independent spectrometry assays conducted at Tata Steel Advanced Water Technology lab at Jamshedpur verify heavy metals reduced to 0.038 mg/L (98.4% removal efficiency). Adsorption bed capacity integrity confirmed.",
    },
  });

  await prisma.pilotVerification.upsert({
    where: { id: "ver33333-3333-4333-aaaa-333333333333" },
    update: {},
    create: {
      id: "ver33333-3333-4333-aaaa-333333333333",
      pilotId: pilotWater.id,
      verifierId: userAdmin.id,
      verificationRole: Role.ADMIN,
      finding: VerificationFinding.SUCCESS_CONFIRMED,
      evidenceType: EvidenceType.WRITTEN_INSPECTION,
      feedbackText: "On-ground physical inspection conducted by Potka BDO and PHED Junior Engineer. Three filtration columns operational; automated shut-off valve functioning during high turbidity.",
    },
  });

  await prisma.pilotVerification.upsert({
    where: { id: "ver44444-4444-4444-aaaa-444444444444" },
    update: {},
    create: {
      id: "ver44444-4444-4444-aaaa-444444444444",
      pilotId: pilotWater.id,
      verifierId: userCitizen.id,
      verificationRole: Role.CITIZEN,
      finding: VerificationFinding.SUCCESS_CONFIRMED,
      evidenceType: EvidenceType.PHOTO_GEOTAG,
      feedbackText: "The drinking water has completely changed. There is no yellowish color or foul chemical taste anymore. Our village children and elders can safely drink from the main borewell again.",
    },
  });

  // =========================================================================
  // 12. PRESERVED LEGACY V2 RECORDS
  // =========================================================================
  console.log("  → Preserving legacy V2 proposal, concept, and support requests...");

  await prisma.proposal.upsert({
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
      budgetRequired: 145000,
      status: ProposalStatus.IN_PROGRESS,
    },
  });

  await prisma.businessConcept.upsert({
    where: { id: SEED_IDS.CONCEPT_1 },
    update: {},
    create: {
      id: SEED_IDS.CONCEPT_1,
      problemId: problem2.id,
      startupId: orgStartup.id,
      solutionDescription: "Low-cost bio-surfactant misting cannons and solar-powered air filtration canopies installed along high-frequency coal transport corridors to suppress particulate dispersion at the point of transit.",
      targetBeneficiaries: "Over 2,400 households, roadside vendors, and school children residing within 150m of the Jharia-Sindri coal transport corridor.",
      marketSize: "Estimated 140km of industrial haul corridors across Dhanbad, Bokaro, and Ramgarh coal belts in Jharkhand.",
      businessModel: "B2B / B2G hardware sales and annual misting consumable service contracts with mining logistics operators and local municipal boards.",
      revenueModel: "Per-kilometer haul road dust suppression service fees and IoT compliance monitoring subscriptions.",
      sustainabilityModel: "Formulation uses biodegradable molasses-derived surfactant, avoiding toxic chemical runoff into local water bodies.",
      currentStage: VentureStage.CONCEPT_SUBMITTED,
    },
  });

  await prisma.supportRequest.upsert({
    where: { id: SEED_IDS.SUPPORT_REQ_1 },
    update: {},
    create: {
      id: SEED_IDS.SUPPORT_REQ_1,
      businessConceptId: SEED_IDS.CONCEPT_1,
      problemId: problem2.id,
      requestedFrom: Role.INDUSTRY,
      requestType: "Pilot Testing & Spectrometry Validation",
      details: "Requesting access to Tata Steel CSR & Environmental Lab for particle size analysis and industrial misting nozzle endurance benchmarking.",
      status: "APPROVED",
      responseNotes: "Tata Steel Engineering Division approved flow bench testing access at Jamshedpur.",
    },
  });

  console.log("✅ CivicBridge Connected V3 Seed Ecosystem successfully planted!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
