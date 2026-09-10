import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  GraduationCap,
  BookOpen,
  Send,
  ListChecks,
  Layers,
  LogOut,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  MapPin,
  ArrowRight,
  RefreshCw,
  Tag,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface UniversityOrg {
  id: string;
  name: string;
  type: string;
  regCode?: string | null;
  domainTags: string[];
  expertiseTags: string[];
  district?: string | null;
  state: string;
}

interface ProposalProblem {
  id: string;
  title: string;
  category: string;
  subCategory?: string | null;
  district: string;
  priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  filterStatus: string;
  status: string;
}

interface ProposalProgressUpdate {
  id: string;
  updateText: string;
  milestoneTitle?: string | null;
  createdAt: string;
  postedBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface UniversityProposal {
  id: string;
  title: string;
  problemId: string;
  problem?: ProposalProblem;
  facultyMentor: string;
  proposedApproach: string;
  deliverables?: string | null;
  budgetRequired?: number | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "WITHDRAWN";
  timelineStart: string;
  timelineEnd: string;
  milestones?: any[];
  progressUpdates?: ProposalProgressUpdate[];
  createdAt: string;
  updatedAt: string;
}

interface RecommendedProblem {
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
    confidenceScore?: number | null;
  } | null;
  matchScore: number;
  matchReasons: string[];
  hasExpressedInterest: boolean;
}

interface DashboardData {
  organization: UniversityOrg;
  stats: {
    totalProposals: number;
    activeProposals: number;
    completedProposals: number;
    expressedInterestCount: number;
  };
  myProposals: UniversityProposal[];
  recommendedProblems: RecommendedProblem[];
  recentActivity: Array<{
    id: string;
    updateText: string;
    milestoneTitle?: string | null;
    proposalId: string;
    proposalTitle?: string;
    problemTitle?: string;
    problemId: string;
    createdAt: string;
    postedBy?: {
      name: string;
      role: string;
    } | null;
  }>;
}

export const UniversityDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recommendations" | "proposals" | "activity">("recommendations");

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/university/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access restricted: This dashboard requires an authenticated UNIVERSITY institutional account.");
        }
        throw new Error(`Failed to load university portal data (HTTP ${res.status}).`);
      }

      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      } else {
        throw new Error(data.error || "Failed to parse dashboard data.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching dashboard information.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  const getProposalStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_REVIEW":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ACCEPTED":
      case "IN_PROGRESS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "COMPLETED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "WITHDRAWN":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-900 rounded-full">
                  University R&D Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                SIH PS 26043 Academic Problem Discovery & Proposal Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-colors min-h-[44px] sm:min-h-0 items-center"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
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

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Loading University Workspace & Recommendations...</p>
            <p className="text-xs text-slate-500">Connecting live academic metadata and Problem Bank feeds.</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-rose-900 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h3 className="font-bold text-sm">Failed to Load University Dashboard</h3>
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
            {/* University Profile Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-sm">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">
                        {dashboardData.organization?.name || user?.organization?.name || "Academic Institution"}
                      </h2>
                      {dashboardData.organization?.regCode && (
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {dashboardData.organization.regCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Faculty Lead: <strong className="text-slate-800">{user?.name}</strong> ({user?.email})
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        {dashboardData.organization?.district || user?.district || "Jharkhand"}, {dashboardData.organization?.state || "Jharkhand"}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-indigo-700">Accredited R&D Hub</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    Role: UNIVERSITY
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

              {/* Domain & Expertise Badges */}
              {((dashboardData.organization?.domainTags && dashboardData.organization.domainTags.length > 0) ||
                (dashboardData.organization?.expertiseTags && dashboardData.organization.expertiseTags.length > 0)) && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Institution Focus Areas:
                  </span>
                  {dashboardData.organization.domainTags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-lg font-medium text-[11px]"
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
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950">
                <span className="font-bold block text-sm">Open Academic Innovation Policy (Zero-Gate):</span>
                <p className="mt-0.5 leading-relaxed">
                  Government verification is an advisory trust signal and <strong>never a gate</strong>. Any civic problem that passes automated AI screening in the statewide Problem Bank is immediately actionable. Faculty and students are encouraged to propose research, sensor pilots, and engineering prototypes on all live community problems.
                </p>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Proposals
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {dashboardData.stats.totalProposals}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">submitted</span>
                </div>
                <p className="text-[11px] text-slate-500">Research & prototype bids</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                  Active Projects
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-900">
                    {dashboardData.stats.activeProposals}
                  </span>
                  <span className="text-xs text-indigo-600 font-medium">in flight</span>
                </div>
                <p className="text-[11px] text-slate-500">Under review or underway</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">
                  Completed Solutions
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-purple-900">
                    {dashboardData.stats.completedProposals}
                  </span>
                  <span className="text-xs text-purple-600 font-medium">delivered</span>
                </div>
                <p className="text-[11px] text-slate-500">Field-tested deliverables</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                  Civic Engagements
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">
                    {dashboardData.stats.expressedInterestCount}
                  </span>
                  <span className="text-xs text-emerald-600 font-medium">problems</span>
                </div>
                <p className="text-[11px] text-slate-500">Distinct issues engaged</p>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${
                  activeTab === "recommendations"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Recommended Problems</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === "recommendations"
                      ? "bg-indigo-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {dashboardData.recommendedProblems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("proposals")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${
                  activeTab === "proposals"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>My Research Proposals</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === "proposals"
                      ? "bg-indigo-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {dashboardData.myProposals.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${
                  activeTab === "activity"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>Project Updates</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === "activity"
                      ? "bg-indigo-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {dashboardData.recentActivity.length}
                </span>
              </button>
            </div>

            {/* ============================================================= */}
            {/* TAB 1: AI RECOMMENDED PROBLEMS                                 */}
            {/* ============================================================= */}
            {activeTab === "recommendations" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Academic Problem Discovery Matches
                    </h3>
                    <p className="text-xs text-slate-500">
                      Problems ranked and explained using institutional domains, faculty expertise, and geographic proximity.
                    </p>
                  </div>

                  <Link
                    to="/problems"
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>View all statewide problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {dashboardData.recommendedProblems.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No active problems match current criteria.</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Explore the statewide Problem Bank to browse and submit proposals on all open community challenges.
                    </p>
                    <Link
                      to="/problems"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Browse Statewide Bank</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.recommendedProblems.map((prob) => (
                      <div
                        key={prob.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Card Header: Category, District & Trust Signal */}
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold rounded-lg">
                                {prob.category}
                              </span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {prob.district}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Trust Signal Badge */}
                              {prob.verificationStatus === "GOVERNMENT_VERIFIED" ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  Gov Verified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-medium text-[10px]">
                                  AI-Screened
                                </span>
                              )}

                              {/* Priority Tier Badge */}
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] border ${getPriorityBadgeClass(
                                  prob.priorityTier
                                )}`}
                              >
                                {prob.priorityTier} ({Math.round(prob.priorityScore)})
                              </span>
                            </div>
                          </div>

                          {/* Problem Title & Brief Description */}
                          <div>
                            <Link
                              to={`/problems/${prob.id}`}
                              className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2"
                            >
                              {prob.title}
                            </Link>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {prob.description}
                            </p>
                          </div>

                          {/* AI Summary snippet if present */}
                          {prob.aiAnalysis?.aiSummary && (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic line-clamp-2">
                              "{prob.aiAnalysis.aiSummary}"
                            </div>
                          )}

                          {/* Explainable Match Reasons */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              Why Recommended:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {prob.matchReasons.map((reason, idx) => (
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

                        {/* Card Action Footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            {prob.hasExpressedInterest ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Proposal Submitted
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-medium">
                                Open for Academic Proposal
                              </span>
                            )}
                          </div>

                          <Link
                            to={`/problems/${prob.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors min-h-[44px] sm:min-h-0 items-center shadow-sm"
                          >
                            <span>{prob.hasExpressedInterest ? "View Project" : "Express Interest"}</span>
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
            {/* TAB 2: MY RESEARCH PROPOSALS                                   */}
            {/* ============================================================= */}
            {activeTab === "proposals" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      Proposals & Academic Projects
                    </h3>
                    <p className="text-xs text-slate-500">
                      All research and prototype proposals submitted by {dashboardData.organization?.name || "your institution"}.
                    </p>
                  </div>
                </div>

                {dashboardData.myProposals.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                    <Send className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No proposals submitted yet.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Discover problems in the statewide Problem Bank and submit your first research or prototype proposal.
                    </p>
                    <button
                      onClick={() => setActiveTab("recommendations")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Explore Recommendations</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.myProposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getProposalStatusBadge(
                                  prop.status
                                )}`}
                              >
                                Status: {prop.status}
                              </span>
                              {prop.problem?.district && (
                                <span className="text-xs font-medium text-slate-500">
                                  District: {prop.problem.district}
                                </span>
                              )}
                              {prop.problem?.category && (
                                <span className="text-xs font-medium text-slate-500">
                                  • {prop.problem.category}
                                </span>
                              )}
                            </div>

                            <h4 className="text-base font-bold text-slate-900">
                              {prop.title || prop.deliverables || "Academic Research Proposal"}
                            </h4>

                            {prop.problem && (
                              <p className="text-xs text-indigo-700 font-medium">
                                Target Problem:{" "}
                                <Link
                                  to={`/problems/${prop.problemId}`}
                                  className="underline hover:text-indigo-900"
                                >
                                  {prop.problem.title}
                                </Link>
                              </p>
                            )}
                          </div>

                          <Link
                            to={`/problems/${prop.problemId}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-xl transition-colors self-start min-h-[44px] sm:min-h-0 items-center"
                          >
                            <span>Open Project Page</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* Proposal Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-500 block font-medium">Faculty Project Lead:</span>
                            <span className="text-slate-900 font-semibold">{prop.facultyMentor}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-medium">Submitted On:</span>
                            <span className="text-slate-900 font-semibold">
                              {new Date(prop.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-medium">Last Activity:</span>
                            <span className="text-slate-900 font-semibold">
                              {new Date(prop.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Proposed Approach Preview */}
                        <div className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">Methodology / Approach:</strong>
                          <p className="line-clamp-3">{prop.proposedApproach}</p>
                        </div>

                        {/* Recent Milestone Updates for this proposal */}
                        {prop.progressUpdates && prop.progressUpdates.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                              Recent Milestone Updates ({prop.progressUpdates.length}):
                            </span>
                            <div className="space-y-1.5">
                              {prop.progressUpdates.slice(0, 2).map((u) => (
                                <div
                                  key={u.id}
                                  className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs flex items-start justify-between gap-2"
                                >
                                  <div>
                                    {u.milestoneTitle && (
                                      <span className="font-bold text-indigo-900 block">
                                        {u.milestoneTitle}
                                      </span>
                                    )}
                                    <p className="text-slate-700 mt-0.5">{u.updateText}</p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    {new Date(u.createdAt).toLocaleDateString()}
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
            {/* TAB 3: RECENT PROJECT ACTIVITY FEED                            */}
            {/* ============================================================= */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-indigo-600" />
                    Institutional Progress Timeline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological audit of milestones, test prototypes, and progress logs reported by academic teams.
                  </p>
                </div>

                {dashboardData.recentActivity.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No project updates logged yet.</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Once proposals are active, project leads can post milestone updates from the Problem Details page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.recentActivity.map((act) => (
                      <div
                        key={act.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold text-[10px]">
                              Update
                            </span>
                            {act.milestoneTitle && (
                              <span className="font-bold text-slate-900">
                                {act.milestoneTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{act.updateText}</p>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>
                              Problem:{" "}
                              <Link
                                to={`/problems/${act.problemId}`}
                                className="font-medium text-indigo-700 hover:underline"
                              >
                                {act.problemTitle || "Civic Problem"}
                              </Link>
                            </span>
                            {act.postedBy?.name && (
                              <>
                                <span>•</span>
                                <span>By {act.postedBy.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {new Date(act.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default UniversityDashboard;
