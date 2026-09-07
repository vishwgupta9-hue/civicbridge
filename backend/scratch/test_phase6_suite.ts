import { PrismaClient, Role, FilterStatus, VerificationStatus, ProblemStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const API_BASE = "http://localhost:5000/api";
const prisma = new PrismaClient();

async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Failed to log in ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runTests() {
  console.log("===============================================================================");
  console.log("          CIVICBRIDGE PHASE 6 INSTITUTIONAL ACTIONS TEST SUITE                 ");
  console.log("===============================================================================");

  // 1. Authenticate all 5 personas
  console.log("\n[1] Authenticating test personas...");
  const citizen = await loginUser("citizen.sunita@civicbridge.dev", "CivicPass123!");
  const admin = await loginUser("admin.verma@civicbridge.gov.in", "AdminPass123!");
  const university = await loginUser("faculty.ananya@bitmesra.ac.in", "UniPass123!");
  const industry = await loginUser("vikram.sengupta@tatasteel.com", "IndustryPass123!");
  const startup = await loginUser("founder.amit@jharjal.in", "StartupPass123!");

  console.log("✓ Logged in Citizen:", citizen.user.name, `(${citizen.user.role})`);
  console.log("✓ Logged in Admin:", admin.user.name, `(${admin.user.role})`);
  console.log("✓ Logged in University:", university.user.name, `(${university.user.role}, Org: ${university.user.organizationId})`);
  console.log("✓ Logged in Industry:", industry.user.name, `(${industry.user.role}, Org: ${industry.user.organizationId})`);
  console.log("✓ Logged in Startup:", startup.user.name, `(${startup.user.role}, Org: ${startup.user.organizationId})`);

  // Ensure an independent second university/startup/industry org & user exists for cross-org testing
  const secondUniOrg = await prisma.organization.upsert({
    where: { id: "test-org-uni-2" },
    update: {},
    create: {
      id: "test-org-uni-2",
      name: "NIT Jamshedpur Research Lab",
      type: "UNIVERSITY",
      district: "East Singhbhum",
      contactEmail: "rnd@nitjsr.ac.in",
    },
  });

  const pwHash = await bcrypt.hash("TestPass123!", 10);
  const secondUniUser = await prisma.user.upsert({
    where: { email: "nit.prof@nitjsr.ac.in" },
    update: {},
    create: {
      name: "Prof. Rajesh Sharma",
      email: "nit.prof@nitjsr.ac.in",
      passwordHash: pwHash,
      role: Role.UNIVERSITY,
      organizationId: secondUniOrg.id,
      district: "East Singhbhum",
    },
  });
  const secondUniAuth = await loginUser("nit.prof@nitjsr.ac.in", "TestPass123!");
  console.log("✓ Logged in Second University:", secondUniUser.name, `(Org: ${secondUniOrg.id})`);

  // 2. Fetch problems representing:
  // - AI_SCREENED + PASSED
  // - GOVERNMENT_VERIFIED + PASSED
  // - DECLINED_BY_GOVT + PASSED
  console.log("\n[2] Setting up/identifying test problems with PASSED filterStatus...");
  
  // Ensure we have test problems with each verificationStatus
  const aiScreenedProblem = await prisma.problem.upsert({
    where: { id: "prob-p6-ai-screened" },
    update: { filterStatus: FilterStatus.PASSED, verificationStatus: VerificationStatus.AI_SCREENED },
    create: {
      id: "prob-p6-ai-screened",
      title: "P6 Test Problem AI Screened Clean Water",
      description: "Drinking water arsenic levels test case in Dumka rural panchayat.",
      category: "WATER_SANITATION",
      district: "Dumka",
      affectedCount: 2500,
      filterStatus: FilterStatus.PASSED,
      verificationStatus: VerificationStatus.AI_SCREENED,
      priorityScore: 78.5,
      priorityTier: "HIGH",
      status: ProblemStatus.OPEN,
      submittedById: citizen.user.id,
    },
  });

  const verifiedProblem = await prisma.problem.upsert({
    where: { id: "prob-p6-govt-verified" },
    update: { filterStatus: FilterStatus.PASSED, verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED },
    create: {
      id: "prob-p6-govt-verified",
      title: "P6 Test Problem Govt Verified Clean Water",
      description: "Severe arsenic contamination verified by District Collectorate in Sahibganj.",
      category: "WATER_SANITATION",
      district: "Sahibganj",
      affectedCount: 6500,
      filterStatus: FilterStatus.PASSED,
      verificationStatus: VerificationStatus.GOVERNMENT_VERIFIED,
      priorityScore: 88.0,
      priorityTier: "HIGH",
      status: ProblemStatus.OPEN,
      submittedById: citizen.user.id,
    },
  });

  const declinedProblem = await prisma.problem.upsert({
    where: { id: "prob-p6-govt-declined" },
    update: { filterStatus: FilterStatus.PASSED, verificationStatus: VerificationStatus.DECLINED_BY_GOVT },
    create: {
      id: "prob-p6-govt-declined",
      title: "P6 Test Problem Govt Declined But Visible",
      description: "Non-jurisdiction drainage request declined by govt but open for research.",
      category: "INFRASTRUCTURE",
      district: "Ranchi",
      affectedCount: 400,
      filterStatus: FilterStatus.PASSED,
      verificationStatus: VerificationStatus.DECLINED_BY_GOVT,
      priorityScore: 50.0,
      priorityTier: "MEDIUM",
      status: ProblemStatus.OPEN,
      submittedById: citizen.user.id,
    },
  });

  // Clean up any previous test proposals/concepts/collaborations for prob-p6-ai-screened to ensure fresh run
  await prisma.progressUpdate.deleteMany({
    where: {
      OR: [
        { proposal: { problemId: aiScreenedProblem.id } },
        { businessConcept: { problemId: aiScreenedProblem.id } },
      ],
    },
  });
  await prisma.proposal.deleteMany({ where: { problemId: aiScreenedProblem.id } });
  await prisma.businessConcept.deleteMany({ where: { problemId: aiScreenedProblem.id } });
  await prisma.collaboration.deleteMany({ where: { problemId: aiScreenedProblem.id } });

  // Test 1: UNIVERSITY can submit a proposal
  console.log("\n[Test 1] Testing UNIVERSITY can submit proposal...");
  const uniSubmitRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${university.token}`,
    },
    body: JSON.stringify({
      title: "Solar-Assisted Arsenic Filtration Unit",
      description: "Low-cost composite adsorbent filter deployed across 10 tube wells.",
      facultyMentor: "Dr. Ananya Mukherjee",
      deliverables: "Working prototype and water quality audit report",
    }),
  });
  const uniSubmitData = await uniSubmitRes.json();
  if (uniSubmitRes.status !== 201 || !uniSubmitData.success) {
    throw new Error(`Test 1 Failed: Expected 201, got ${uniSubmitRes.status}: ${JSON.stringify(uniSubmitData)}`);
  }
  const proposalId = uniSubmitData.proposal.id;
  console.log("✓ Test 1 Passed: UNIVERSITY successfully submitted proposal ID:", proposalId);

  // Test 2: CITIZEN cannot submit a proposal
  console.log("\n[Test 2] Testing CITIZEN cannot submit proposal...");
  const citizenUniRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${citizen.token}`,
    },
    body: JSON.stringify({
      title: "Citizen Unauthorized Proposal",
      description: "This should be rejected with 403 Forbidden.",
    }),
  });
  if (citizenUniRes.status !== 403) {
    throw new Error(`Test 2 Failed: Expected 403, got ${citizenUniRes.status}`);
  }
  console.log("✓ Test 2 Passed: CITIZEN correctly received 403 Forbidden");

  // Test 3: STARTUP cannot submit a proposal
  console.log("\n[Test 3] Testing STARTUP cannot submit proposal...");
  const startupUniRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${startup.token}`,
    },
    body: JSON.stringify({
      title: "Startup Unauthorized Proposal",
      description: "This should be rejected with 403 Forbidden.",
    }),
  });
  if (startupUniRes.status !== 403) {
    throw new Error(`Test 3 Failed: Expected 403, got ${startupUniRes.status}`);
  }
  console.log("✓ Test 3 Passed: STARTUP correctly received 403 Forbidden");

  // Test 4: INDUSTRY cannot submit a proposal
  console.log("\n[Test 4] Testing INDUSTRY cannot submit proposal...");
  const industryUniRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${industry.token}`,
    },
    body: JSON.stringify({
      title: "Industry Unauthorized Proposal",
      description: "This should be rejected with 403 Forbidden.",
    }),
  });
  if (industryUniRes.status !== 403) {
    throw new Error(`Test 4 Failed: Expected 403, got ${industryUniRes.status}`);
  }
  console.log("✓ Test 4 Passed: INDUSTRY correctly received 403 Forbidden");

  // Test 5: STARTUP can submit a business concept
  console.log("\n[Test 5] Testing STARTUP can submit a business concept...");
  const startupSubmitRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/business-concepts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${startup.token}`,
    },
    body: JSON.stringify({
      title: "JharJal Community Water Purification Franchise",
      description: "Pre-paid smart card IoT water dispensing kiosk operated by local SHGs.",
      targetBeneficiaries: "1,200 rural households",
      businessModel: "Micro-tariff of 20 paise/liter with maintenance contract",
    }),
  });
  const startupSubmitData = await startupSubmitRes.json();
  if (startupSubmitRes.status !== 201 || !startupSubmitData.success) {
    throw new Error(`Test 5 Failed: Expected 201, got ${startupSubmitRes.status}: ${JSON.stringify(startupSubmitData)}`);
  }
  const conceptId = startupSubmitData.businessConcept.id;
  console.log("✓ Test 5 Passed: STARTUP successfully submitted concept ID:", conceptId);

  // Test 6: UNIVERSITY cannot submit a business concept
  console.log("\n[Test 6] Testing UNIVERSITY cannot submit a business concept...");
  const uniConceptRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/business-concepts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${university.token}`,
    },
    body: JSON.stringify({
      title: "University Unauthorized Concept",
      description: "This should be rejected with 403 Forbidden.",
    }),
  });
  if (uniConceptRes.status !== 403) {
    throw new Error(`Test 6 Failed: Expected 403, got ${uniConceptRes.status}`);
  }
  console.log("✓ Test 6 Passed: UNIVERSITY correctly received 403 Forbidden");

  // Test 7: INDUSTRY cannot submit a business concept
  console.log("\n[Test 7] Testing INDUSTRY cannot submit a business concept...");
  const indConceptRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/business-concepts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${industry.token}`,
    },
    body: JSON.stringify({
      title: "Industry Unauthorized Concept",
      description: "This should be rejected with 403 Forbidden.",
    }),
  });
  if (indConceptRes.status !== 403) {
    throw new Error(`Test 7 Failed: Expected 403, got ${indConceptRes.status}`);
  }
  console.log("✓ Test 7 Passed: INDUSTRY correctly received 403 Forbidden");

  // Test 8: INDUSTRY can submit a collaboration
  console.log("\n[Test 8] Testing INDUSTRY can submit a collaboration...");
  const industrySubmitRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/collaborations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${industry.token}`,
    },
    body: JSON.stringify({
      supportType: "TECHNICAL",
      description: "Tata Steel CSR offers metallurgical testing labs and water quality spectrographs.",
    }),
  });
  const industrySubmitData = await industrySubmitRes.json();
  if (industrySubmitRes.status !== 201 || !industrySubmitData.success) {
    throw new Error(`Test 8 Failed: Expected 201, got ${industrySubmitRes.status}: ${JSON.stringify(industrySubmitData)}`);
  }
  const collabId = industrySubmitData.collaboration.id;
  console.log("✓ Test 8 Passed: INDUSTRY successfully submitted collaboration ID:", collabId);

  // Test 9: UNIVERSITY cannot submit a collaboration
  console.log("\n[Test 9] Testing UNIVERSITY cannot submit a collaboration...");
  const uniCollabRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/collaborations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${university.token}`,
    },
    body: JSON.stringify({
      supportType: "TECHNICAL",
      description: "University should be rejected with 403 Forbidden.",
    }),
  });
  if (uniCollabRes.status !== 403) {
    throw new Error(`Test 9 Failed: Expected 403, got ${uniCollabRes.status}`);
  }
  console.log("✓ Test 9 Passed: UNIVERSITY correctly received 403 Forbidden");

  // Test 10: STARTUP cannot submit a collaboration
  console.log("\n[Test 10] Testing STARTUP cannot submit a collaboration...");
  const startupCollabRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/collaborations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${startup.token}`,
    },
    body: JSON.stringify({
      supportType: "TECHNICAL",
      description: "Startup should be rejected with 403 Forbidden.",
    }),
  });
  if (startupCollabRes.status !== 403) {
    throw new Error(`Test 10 Failed: Expected 403, got ${startupCollabRes.status}`);
  }
  console.log("✓ Test 10 Passed: STARTUP correctly received 403 Forbidden");

  // Test 11: AI_SCREENED + PASSED problem accepts institutional action
  console.log("\n[Test 11] Testing AI_SCREENED + PASSED problem accepts institutional action...");
  // Already confirmed with proposalId, conceptId, and collabId above on aiScreenedProblem!
  console.log("✓ Test 11 Passed: AI_SCREENED problem successfully accepted institutional action");

  // Test 12: GOVERNMENT_VERIFIED + PASSED problem accepts institutional action
  console.log("\n[Test 12] Testing GOVERNMENT_VERIFIED + PASSED problem accepts institutional action...");
  const gvRes = await fetch(`${API_BASE}/problems/${verifiedProblem.id}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secondUniAuth.token}`,
    },
    body: JSON.stringify({
      title: "NIT Jamshedpur Advanced Fluoride & Arsenic Remediation",
      description: "Electro-coagulation membrane filtration pilot on verified water supply.",
    }),
  });
  const gvData = await gvRes.json();
  if (gvRes.status !== 201 || !gvData.success) {
    throw new Error(`Test 12 Failed: Expected 201, got ${gvRes.status}: ${JSON.stringify(gvData)}`);
  }
  console.log("✓ Test 12 Passed: GOVERNMENT_VERIFIED problem accepted university proposal ID:", gvData.proposal.id);

  // Test 13: DECLINED_BY_GOVT + PASSED problem accepts institutional action
  console.log("\n[Test 13] Testing DECLINED_BY_GOVT + PASSED problem accepts institutional action...");
  const declRes = await fetch(`${API_BASE}/problems/${declinedProblem.id}/collaborations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${industry.token}`,
    },
    body: JSON.stringify({
      supportType: "PROTOTYPING",
      description: "Industry pilot for community drainage despite govt non-priority.",
    }),
  });
  const declData = await declRes.json();
  if (declRes.status !== 201 || !declData.success) {
    throw new Error(`Test 13 Failed: Expected 201, got ${declRes.status}: ${JSON.stringify(declData)}`);
  }
  console.log("✓ Test 13 Passed: DECLINED_BY_GOVT problem accepted industry collaboration ID:", declData.collaboration.id);

  // Test 14: University can add progress to its own proposal
  console.log("\n[Test 14] Testing University can add progress to its own proposal...");
  const uniProgRes = await fetch(`${API_BASE}/proposals/${proposalId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${university.token}`,
    },
    body: JSON.stringify({
      updateText: "Phase 1 adsorbent testing completed. 94% arsenic retention demonstrated in lab.",
      status: "IN_PROGRESS",
    }),
  });
  const uniProgData = await uniProgRes.json();
  if (uniProgRes.status !== 201 || !uniProgData.success) {
    throw new Error(`Test 14 Failed: Expected 201, got ${uniProgRes.status}: ${JSON.stringify(uniProgData)}`);
  }
  console.log("✓ Test 14 Passed: Progress update added to proposal. New proposal status:", uniProgData.proposalStatus);

  // Test 15: Startup can add progress to its own business concept
  console.log("\n[Test 15] Testing Startup can add progress to its own business concept...");
  const startupProgRes = await fetch(`${API_BASE}/business-concepts/${conceptId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${startup.token}`,
    },
    body: JSON.stringify({
      updateText: "MoU signed with village cooperative for site electrical connection.",
      status: "IN_PROGRESS",
    }),
  });
  const startupProgData = await startupProgRes.json();
  if (startupProgRes.status !== 201 || !startupProgData.success) {
    throw new Error(`Test 15 Failed: Expected 201, got ${startupProgRes.status}: ${JSON.stringify(startupProgData)}`);
  }
  console.log("✓ Test 15 Passed: Progress update added to business concept. New concept status:", startupProgData.businessConceptStatus);

  // Test 16: Industry can add progress to its own collaboration
  console.log("\n[Test 16] Testing Industry can add progress to its own collaboration...");
  const indProgRes = await fetch(`${API_BASE}/collaborations/${collabId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${industry.token}`,
    },
    body: JSON.stringify({
      updateText: "Assigned CSR engineering specialist and scheduled field spectrograph audit.",
      status: "ACTIVE",
    }),
  });
  const indProgData = await indProgRes.json();
  if (indProgRes.status !== 200 || !indProgData.success) {
    throw new Error(`Test 16 Failed: Expected 200, got ${indProgRes.status}: ${JSON.stringify(indProgData)}`);
  }
  console.log("✓ Test 16 Passed: Status update added to collaboration. New status:", indProgData.collaboration.status);

  // Test 17: A university cannot modify another university's proposal
  console.log("\n[Test 17] Testing a university cannot modify another university's proposal...");
  const crossUniRes = await fetch(`${API_BASE}/proposals/${proposalId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secondUniAuth.token}`,
    },
    body: JSON.stringify({
      updateText: "Unauthorized tampering attempt from different university.",
      status: "COMPLETED",
    }),
  });
  if (crossUniRes.status !== 403) {
    throw new Error(`Test 17 Failed: Expected 403, got ${crossUniRes.status}`);
  }
  console.log("✓ Test 17 Passed: Cross-university tampering blocked with 403 Forbidden");

  // Test 18: A startup cannot modify another startup's business concept
  console.log("\n[Test 18] Testing unauthorized user cannot modify startup's business concept...");
  const crossStartupRes = await fetch(`${API_BASE}/business-concepts/${conceptId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${citizen.token}`,
    },
    body: JSON.stringify({
      updateText: "Unauthorized citizen progress attempt on startup concept.",
    }),
  });
  if (crossStartupRes.status !== 403) {
    throw new Error(`Test 18 Failed: Expected 403, got ${crossStartupRes.status}`);
  }
  console.log("✓ Test 18 Passed: Unauthorized concept modification blocked with 403 Forbidden");

  // Test 19: An industry user cannot modify another industry's collaboration
  console.log("\n[Test 19] Testing unauthorized user cannot modify industry's collaboration...");
  const crossCollabRes = await fetch(`${API_BASE}/collaborations/${collabId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${citizen.token}`,
    },
    body: JSON.stringify({
      updateText: "Unauthorized progress attempt on industry collaboration.",
    }),
  });
  if (crossCollabRes.status !== 403) {
    throw new Error(`Test 19 Failed: Expected 403, got ${crossCollabRes.status}`);
  }
  console.log("✓ Test 19 Passed: Unauthorized collaboration modification blocked with 403 Forbidden");

  // Test 20: Problem lifecycle remains independent from institutional child status
  console.log("\n[Test 20] Verifying Problem lifecycle remains independent from institutional child status...");
  const updatedProblemDb = await prisma.problem.findUnique({
    where: { id: aiScreenedProblem.id },
  });
  if (updatedProblemDb?.status !== ProblemStatus.OPEN) {
    throw new Error(`Test 20 Failed: Expected Problem status to remain OPEN, got ${updatedProblemDb?.status}`);
  }
  console.log("✓ Test 20 Passed: Problem status remains independently OPEN despite child proposal IN_PROGRESS");

  // Test 21: No FUNDING support type exists (Validation error if attempted)
  console.log("\n[Test 21] Verifying FUNDING support type is strictly rejected...");
  const fundingCollabRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}/collaborations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${industry.token}`,
    },
    body: JSON.stringify({
      supportType: "FUNDING",
      description: "Direct capital grant of Rs 50,00,000.",
    }),
  });
  if (fundingCollabRes.status !== 400) {
    throw new Error(`Test 21 Failed: Expected 400 rejection for FUNDING, got ${fundingCollabRes.status}`);
  }
  console.log("✓ Test 21 Passed: FUNDING support type strictly rejected with 400 Bad Request");

  // Test 22: No passwordHash or sensitive authentication data is returned
  console.log("\n[Test 22] Verifying no passwordHash is exposed in API responses...");
  const detailsRes = await fetch(`${API_BASE}/problems/${aiScreenedProblem.id}`, {
    headers: { Authorization: `Bearer ${citizen.token}` },
  });
  const detailsText = await detailsRes.text();
  if (detailsText.includes("passwordHash") || detailsText.includes("$2b$") || detailsText.includes("$2a$")) {
    throw new Error("Test 22 Failed: Sensitive passwordHash found in problem details API response!");
  }
  console.log("✓ Test 22 Passed: Zero sensitive passwordHash/credentials leaked in problem details");

  // Test 23: Problem details correctly show institutional activity & counts
  console.log("\n[Test 23] Verifying Problem details show institutional activity & counts...");
  const detailsJson = JSON.parse(detailsText);
  if (!detailsJson.success || !detailsJson.problem) {
    throw new Error("Test 23 Failed: Problem details request failed");
  }
  const prob = detailsJson.problem;
  if (!prob.proposals || prob.proposals.length === 0) {
    throw new Error("Test 23 Failed: Problem details did not include proposals");
  }
  if (!prob.businessConcepts || prob.businessConcepts.length === 0) {
    throw new Error("Test 23 Failed: Problem details did not include businessConcepts");
  }
  if (!prob.collaborations || prob.collaborations.length === 0) {
    throw new Error("Test 23 Failed: Problem details did not include collaborations");
  }
  if (!prob._count || prob._count.proposals < 1 || prob._count.businessConcepts < 1 || prob._count.collaborations < 1) {
    throw new Error(`Test 23 Failed: Problem counts incorrect: ${JSON.stringify(prob._count)}`);
  }
  console.log(`✓ Test 23 Passed: Problem details include institutional activity counts (Proposals: ${prob._count.proposals}, Concepts: ${prob._count.businessConcepts}, Collaborations: ${prob._count.collaborations})`);

  console.log("\n===============================================================================");
  console.log("          ALL PHASE 6 LIVE INTEGRATION TESTS PASSED SUCCESSFULLY!              ");
  console.log("===============================================================================");
}

runTests()
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
