import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  Rocket,
  Layers,
  LogOut,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  MapPin,
  Users,
  ArrowRight,
  RefreshCw,
  Tag,
  AlertCircle,
  ExternalLink,
  Target,
  TrendingUp,
  HelpCircle,
  X,
} from "lucide-react";

interface StartupOrg {
  id: string;
  name: string;
  type: string;
  regCode?: string | null;
  domainTags: string[];
  expertiseTags: string[];
  district?: string | null;
  state: string;
}

interface SupportRequestItem {
  id: string;
  requestedFrom: string;
  requestType: string;
  details: string;
  status: string;
  responseNotes?: string | null;
  createdAt: string;
  problem?: {
    id: string;
    title: string;
    district: string;
    category: string;
  };
  businessConcept?: {
    id: string;
    currentStage: string;
    solutionDescription: string;
  };
}

interface ConceptItem {
  id: string;
  title?: string;
  problemId: string;
  problem?: {
    id: string;
    title: string;
    category: string;
    subCategory?: string | null;
    district: string;
    affectedCount: number;
    priorityScore: number;
    priorityTier: "HIGH" | "MEDIUM" | "LOW";
    verificationStatus: string;
    status: string;
  };
  solutionDescription: string;
  targetBeneficiaries: string;
  marketSize?: string | null;
  businessModel: string;
  revenueModel: string;
  sustainabilityModel: string;
  currentStage: "PROBLEM_CLAIMED" | "CONCEPT_SUBMITTED" | "SUPPORT_REQUESTED" | "SUPPORT_GRANTED" | "BUILDING" | "PILOTED";
  supportRequests?: SupportRequestItem[];
  progressUpdates?: Array<{
    id: string;
    updateText: string;
    milestoneTitle?: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface RecommendedOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string | null;
  district: string;
  locationText?: string | null;
  affectedCount: number;
  priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  status: string;
  createdAt: string;
  aiAnalysis?: {
    aiSummary?: string | null;
    predictedCategory?: string | null;
  } | null;
  matchScore: number;
  matchReasons: string[];
  isClaimed: boolean;
  currentStage?: string | null;
  solverActivity?: {
    proposalsCount: number;
    conceptsCount: number;
    collaborationsCount: number;
  };
}

interface DashboardData {
  organization: StartupOrg;
  stats: {
    totalClaims: number;
    totalConcepts: number;
    activePilots: number;
    supportRequestsCount: number;
  };
  myClaims: ConceptItem[];
  myConcepts: ConceptItem[];
  recommendedOpportunities: RecommendedOpportunity[];
  supportRequests: SupportRequestItem[];
  recentActivity: Array<{
    id: string;
    updateText: string;
    milestoneTitle?: string | null;
    conceptId: string;
    conceptTitle?: string;
    problemTitle?: string;
    problemId: string;
    createdAt: string;
  }>;
}

export const StartupDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"opportunities" | "concepts" | "support">("opportunities");

  // Claim Opportunity Modal
  const [claimTarget, setClaimTarget] = useState<RecommendedOpportunity | null>(null);
  const [claimNotes, setClaimNotes] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  // File Support Request Modal
  const [supportModalTarget, setSupportModalTarget] = useState<ConceptItem | null>(null);
  const [supportForm, setSupportForm] = useState({
    requestedFrom: "UNIVERSITY",
    requestType: "Lab Testing & Validation",
    details: "",
  });
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/startup/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access restricted: This dashboard requires an authenticated STARTUP account.");
        }
        throw new Error(`Failed to load startup portal data (HTTP ${res.status}).`);
      }

      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      } else {
        throw new Error(data.error || "Failed to parse dashboard data.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred loading startup data.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Opportunity Claim
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !claimTarget) return;

    setClaimLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/startup/claim/${claimTarget.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: claimNotes }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to claim opportunity.");
      }

      setClaimSuccess("Opportunity successfully claimed for solution development!");
      setClaimNotes("");
      setTimeout(() => {
        setClaimTarget(null);
        setClaimSuccess(null);
      }, 1500);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to claim opportunity");
    } finally {
      setClaimLoading(false);
    }
  };

  // Handle Support Request Submission
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !supportModalTarget) return;

    setSupportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/startup/support-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemId: supportModalTarget.problemId,
          businessConceptId: supportModalTarget.id,
          requestedFrom: supportForm.requestedFrom,
          requestType: supportForm.requestType,
          details: supportForm.details,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit support request.");
      }

      setSupportSuccess("Support request filed successfully!");
      setSupportForm({ requestedFrom: "UNIVERSITY", requestType: "Lab Testing & Validation", details: "" });
      setTimeout(() => {
        setSupportModalTarget(null);
        setSupportSuccess(null);
      }, 1500);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to file support request");
    } finally {
      setSupportLoading(false);
    }
  };

  const getPriorityBadgeClass = (tier: string) => {
    switch (tier) {
      case "HIGH":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case "PROBLEM_CLAIMED":
        return "bg-cyan-50 text-cyan-800 border-cyan-200";
      case "CONCEPT_SUBMITTED":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "SUPPORT_REQUESTED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "SUPPORT_GRANTED":
      case "BUILDING":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "PILOTED":
        return "bg-purple-50 text-purple-800 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-cyan-100 text-cyan-900 rounded-full">
                  Startup Venture Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                SIH PS 26043 Community Problem-Solving Platform for Jharkhand
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-bold text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3.5 py-2 rounded-xl transition-colors min-h-[44px] sm:min-h-0 items-center"
            >
              <Layers className="w-4 h-4 text-cyan-600" />
              <span>Browse Problem Bank</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors min-h-[44px] sm:min-h-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {isLoading && (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Loading Startup Workspace & Opportunities...</p>
            <p className="text-xs text-slate-500">Matching problem bank data with company capabilities.</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-rose-900 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h3 className="font-bold text-sm">Failed to Load Startup Dashboard</h3>
              <p className="mt-1">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && dashboardData && (
          <>
            {/* Startup Profile Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 shadow-sm">
                    <Rocket className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">
                        {dashboardData.organization?.name || user?.organization?.name || "Startup Venture"}
                      </h2>
                      {dashboardData.organization?.regCode && (
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {dashboardData.organization.regCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Founder / Lead: <strong className="text-slate-800">{user?.name}</strong> ({user?.email})
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                        {dashboardData.organization?.district || user?.district || "Jharkhand"}, {dashboardData.organization?.state || "Jharkhand"}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-cyan-700">DPIIT Recognized Startup</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                    Role: STARTUP
                  </span>
                  <Link
                    to="/problems"
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm min-h-[44px] sm:min-h-0 items-center"
                  >
                    <span>Statewide Bank</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Focus Capabilities & Domain Tags */}
              {((dashboardData.organization?.domainTags && dashboardData.organization.domainTags.length > 0) ||
                (dashboardData.organization?.expertiseTags && dashboardData.organization.expertiseTags.length > 0)) && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-cyan-600" />
                    Core Capabilities:
                  </span>
                  {dashboardData.organization.domainTags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-100 rounded-lg font-medium text-[11px]"
                    >
                      {tag}
                    </span>
                  ))}
                  {dashboardData.organization.expertiseTags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg font-medium text-[11px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Zero-Gate Trust Signal Policy Banner */}
            <div className="bg-cyan-50/80 border border-cyan-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
              <div className="text-xs text-cyan-950">
                <span className="font-bold block text-sm">Open Civic Opportunity Access (Zero-Gate):</span>
                <p className="mt-0.5 leading-relaxed">
                  Government verification is an advisory trust badge and <strong>never a prerequisite</strong>. Startups can immediately claim problems, formulate business models, and request testing or mentorship on any problem that has passed automated AI screening in the Problem Bank.
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Claimed Problems
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {dashboardData.stats.totalClaims}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">active claims</span>
                </div>
                <p className="text-[11px] text-slate-500">Expressed interest</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
                  Business Concepts
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-900">
                    {dashboardData.stats.totalConcepts}
                  </span>
                  <span className="text-xs text-blue-600 font-medium">formulated</span>
                </div>
                <p className="text-[11px] text-slate-500">Structured solutions</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                  Active Pilots
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">
                    {dashboardData.stats.activePilots}
                  </span>
                  <span className="text-xs text-emerald-600 font-medium">in field</span>
                </div>
                <p className="text-[11px] text-slate-500">Building or deployed</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
                  Support Requests
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-900">
                    {dashboardData.stats.supportRequestsCount}
                  </span>
                  <span className="text-xs text-amber-600 font-medium">filed</span>
                </div>
                <p className="text-[11px] text-slate-500">Testing & mentorship</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("opportunities")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${
                  activeTab === "opportunities"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Recommended Opportunities</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === "opportunities"
                      ? "bg-cyan-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {dashboardData.recommendedOpportunities.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("concepts")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${
                  activeTab === "concepts"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>My Business Concepts</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === "concepts"
                      ? "bg-cyan-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {dashboardData.myConcepts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("support")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${
                  activeTab === "support"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Support Requests ({dashboardData.supportRequests.length})</span>
              </button>
            </div>

            {/* ============================================================= */}
            {/* TAB 1: AI RECOMMENDED OPPORTUNITIES                           */}
            {/* ============================================================= */}
            {activeTab === "opportunities" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      Validated Civic Opportunities
                    </h3>
                    <p className="text-xs text-slate-500">
                      Problems ranked using domain capabilities, technology focus, and local district presence.
                    </p>
                  </div>

                  <Link
                    to="/problems"
                    className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>View all statewide problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {dashboardData.recommendedOpportunities.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                    <Target className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No opportunities match current criteria.</p>
                    <Link
                      to="/problems"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Browse Problem Bank</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.recommendedOpportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Header: Category, District & Trust Signal */}
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-1 bg-cyan-50 text-cyan-800 font-bold rounded-lg">
                                {opp.category}
                              </span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {opp.district}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {opp.verificationStatus === "GOVERNMENT_VERIFIED" ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  Gov Verified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded font-medium text-[10px]">
                                  AI-Screened
                                </span>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] border ${getPriorityBadgeClass(
                                  opp.priorityTier
                                )}`}
                              >
                                {opp.priorityTier} ({Math.round(opp.priorityScore)})
                              </span>
                            </div>
                          </div>

                          {/* Problem Title & Description */}
                          <div>
                            <Link
                              to={`/problems/${opp.id}`}
                              className="text-base font-bold text-slate-900 hover:text-cyan-600 transition-colors line-clamp-2"
                            >
                              {opp.title}
                            </Link>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {opp.description}
                            </p>
                          </div>

                          {/* Market Scope: Affected Population */}
                          <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Users className="w-3.5 h-3.5 text-cyan-600" />
                              {opp.affectedCount.toLocaleString()} Citizens Affected
                            </span>
                            {opp.solverActivity && (
                              <span className="text-[11px] text-slate-500">
                                • {opp.solverActivity.proposalsCount} Proposals, {opp.solverActivity.conceptsCount} Concepts
                              </span>
                            )}
                          </div>

                          {/* Explainable Match Reasons */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-600" />
                              Why Recommended:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {opp.matchReasons.map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-md font-medium text-[10px]"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            {opp.isClaimed ? (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${getStageBadgeClass(
                                  opp.currentStage || "PROBLEM_CLAIMED"
                                )}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {opp.currentStage?.replace("_", " ") || "Claimed"}
                              </span>
                            ) : (
                              <button
                                onClick={() => setClaimTarget(opp)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-xl transition-colors min-h-[44px] sm:min-h-0 items-center"
                              >
                                <Target className="w-3.5 h-3.5" />
                                <span>Claim Opportunity</span>
                              </button>
                            )}
                          </div>

                          <Link
                            to={`/problems/${opp.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors min-h-[44px] sm:min-h-0 items-center shadow-sm"
                          >
                            <span>Open Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: MY BUSINESS CONCEPTS & CLAIMS                          */}
            {/* ============================================================= */}
            {activeTab === "concepts" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-600" />
                      Venture Concepts & Claimed Opportunities
                    </h3>
                    <p className="text-xs text-slate-500">
                      Track solution development stages from initial claim to field testing.
                    </p>
                  </div>
                </div>

                {dashboardData.myConcepts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                    <Target className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No opportunities claimed yet.</p>
                    <button
                      onClick={() => setActiveTab("opportunities")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Explore Recommendations</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.myConcepts.map((concept) => (
                      <div
                        key={concept.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStageBadgeClass(
                                  concept.currentStage
                                )}`}
                              >
                                Stage: {concept.currentStage.replace("_", " ")}
                              </span>
                              {concept.problem?.district && (
                                <span className="text-xs font-medium text-slate-500">
                                  District: {concept.problem.district}
                                </span>
                              )}
                              {concept.problem?.category && (
                                <span className="text-xs font-medium text-slate-500">
                                  • {concept.problem.category}
                                </span>
                              )}
                            </div>

                            <h4 className="text-base font-bold text-slate-900">
                              {concept.title || concept.solutionDescription.slice(0, 60)}
                            </h4>

                            {concept.problem && (
                              <p className="text-xs text-cyan-700 font-medium">
                                Target Problem:{" "}
                                <Link
                                  to={`/problems/${concept.problemId}`}
                                  className="underline hover:text-cyan-900"
                                >
                                  {concept.problem.title}
                                </Link>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-start">
                            <button
                              onClick={() => setSupportModalTarget(concept)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 transition-colors min-h-[44px] sm:min-h-0 items-center"
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Request Support</span>
                            </button>

                            <Link
                              to={`/problems/${concept.problemId}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 text-xs font-bold rounded-xl transition-colors min-h-[44px] sm:min-h-0 items-center"
                            >
                              <span>Details</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        {/* Model Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <strong className="text-slate-800 block mb-0.5">Solution Description:</strong>
                            <p className="text-slate-600 leading-relaxed line-clamp-3">
                              {concept.solutionDescription}
                            </p>
                          </div>
                          <div>
                            <strong className="text-slate-800 block mb-0.5">Business & Delivery Model:</strong>
                            <p className="text-slate-600 leading-relaxed line-clamp-3">
                              {concept.businessModel}
                            </p>
                          </div>
                        </div>

                        {/* Support Requests Associated */}
                        {concept.supportRequests && concept.supportRequests.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              Support Requests Filed ({concept.supportRequests.length}):
                            </span>
                            <div className="space-y-1.5">
                              {concept.supportRequests.map((req) => (
                                <div
                                  key={req.id}
                                  className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100 text-xs flex items-start justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-amber-900">
                                        To {req.requestedFrom}: {req.requestType}
                                      </span>
                                      <span className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-bold rounded border border-amber-200">
                                        {req.status}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 mt-0.5">{req.details}</p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    {new Date(req.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3: SUPPORT REQUESTS                                       */}
            {/* ============================================================= */}
            {activeTab === "support" && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-600" />
                    Institutional Support Requests
                  </h3>
                  <p className="text-xs text-slate-500">
                    Requests for university lab validation, industrial prototyping facilities, or government scheme referrals.
                  </p>
                </div>

                {dashboardData.supportRequests.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No support requests filed yet.</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Startups can request academic lab testing, technical prototyping, or mentorship directly on claimed concepts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.supportRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-cyan-100 text-cyan-900 rounded font-bold text-[10px]">
                              Requested From: {req.requestedFrom}
                            </span>
                            <span className="font-bold text-slate-900">{req.requestType}</span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                req.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : req.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{req.details}</p>
                          {req.problem && (
                            <p className="text-[11px] text-slate-500">
                              Problem:{" "}
                              <Link
                                to={`/problems/${req.problem.id}`}
                                className="text-cyan-700 font-medium hover:underline"
                              >
                                {req.problem.title}
                              </Link>{" "}
                              ({req.problem.district})
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* CLAIM MODAL */}
        {claimTarget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-600" />
                  Claim Civic Opportunity
                </h3>
                <button
                  onClick={() => setClaimTarget(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 text-xs text-cyan-950">
                <strong>{claimTarget.title}</strong>
                <p className="text-cyan-800 mt-1 line-clamp-2">{claimTarget.description}</p>
              </div>

              {claimSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {claimSuccess}
                </div>
              ) : (
                <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Initial Notes / Scope of Interest:
                    </label>
                    <textarea
                      value={claimNotes}
                      onChange={(e) => setClaimNotes(e.target.value)}
                      placeholder="Briefly describe how your startup plans to approach this civic problem..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setClaimTarget(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={claimLoading}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {claimLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Confirm Claim</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* SUPPORT REQUEST MODAL */}
        {supportModalTarget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                  File Institutional Support Request
                </h3>
                <button
                  onClick={() => setSupportModalTarget(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {supportSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {supportSuccess}
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Institution Role:</label>
                    <select
                      value={supportForm.requestedFrom}
                      onChange={(e) => setSupportForm({ ...supportForm, requestedFrom: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      <option value="UNIVERSITY">University (Academic Labs / Testing Facilities / Faculty)</option>
                      <option value="INDUSTRY">Industry (Prototyping Facilities / Technical Mentorship)</option>
                      <option value="ADMIN">Government / Admin (Scheme Referral / Pilot Approvals)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Support Category / Type:</label>
                    <input
                      type="text"
                      value={supportForm.requestType}
                      onChange={(e) => setSupportForm({ ...supportForm, requestType: e.target.value })}
                      placeholder="e.g. Lab Water Quality Testing, Manufacturing Prototype, Mentorship"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Specific Request Details:</label>
                    <textarea
                      value={supportForm.details}
                      onChange={(e) => setSupportForm({ ...supportForm, details: e.target.value })}
                      placeholder="Describe what specific resources, facilities, or guidance your startup needs..."
                      rows={4}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSupportModalTarget(null)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={supportLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {supportLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>Submit Request</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StartupDashboard;
