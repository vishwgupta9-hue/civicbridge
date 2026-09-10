import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  GraduationCap, BookOpen, Send, ListChecks, Layers, LogOut,
  CheckCircle2, Clock, Sparkles, ShieldCheck, MapPin, ArrowRight,
  RefreshCw, Tag, AlertCircle, ExternalLink, ArrowRightLeft,
  FlaskConical, Microscope, Rocket, Cpu, Plus, Activity, ChevronRight,
  BookMarked, Target, Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UniversityOrg {
  id: string; name: string; type: string; regCode?: string | null;
  domainTags: string[]; expertiseTags: string[]; district?: string | null; state: string;
}
interface ProposalProblem {
  id: string; title: string; category: string; subCategory?: string | null; district: string;
  priorityScore: number; priorityTier: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  filterStatus: string; status: string;
}
interface ProposalProgressUpdate {
  id: string; updateText: string; milestoneTitle?: string | null; createdAt: string;
  postedBy?: { id: string; name: string; role: string } | null;
}
interface UniversityProposal {
  id: string; title: string; problemId: string; problem?: ProposalProblem;
  facultyMentor: string; proposedApproach: string; deliverables?: string | null;
  budgetRequired?: number | null;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "WITHDRAWN";
  timelineStart: string; timelineEnd: string; milestones?: any[];
  progressUpdates?: ProposalProgressUpdate[]; createdAt: string; updatedAt: string;
}
interface RecommendedProblem {
  id: string; title: string; description: string; category: string; subCategory?: string | null;
  district: string; locationText?: string | null; affectedCount: number; priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  status: string; createdAt: string;
  aiAnalysis?: { aiSummary?: string | null; predictedCategory?: string | null; confidenceScore?: number | null } | null;
  matchScore: number; matchReasons: string[]; hasExpressedInterest: boolean;
}
interface UniversityNeed {
  id: string; category: string; title: string; details: string; district?: string | null;
  urgency: "STANDARD" | "CRITICAL_PATH"; status: "OPEN" | "COMMITTED" | "FULFILLED" | "CANCELLED";
  createdAt: string; project?: { id: string; title: string; status: string } | null;
  milestone?: { id: string; title: string } | null;
}
interface DashboardData {
  organization: UniversityOrg;
  stats: { totalProposals: number; activeProposals: number; completedProposals: number; expressedInterestCount: number };
  myProposals: UniversityProposal[];
  recommendedProblems: RecommendedProblem[];
  recentActivity: Array<{
    id: string; updateText: string; milestoneTitle?: string | null; proposalId: string;
    proposalTitle?: string; problemTitle?: string; problemId: string; createdAt: string;
    postedBy?: { name: string; role: string } | null;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getPriorityBadgeClass = (tier: string) => {
  switch (tier) {
    case "HIGH": return "bg-rose-50 text-rose-700 border-rose-200";
    case "MEDIUM": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getProposalStatusBadge = (status: string) => {
  switch (status) {
    case "SUBMITTED": return "bg-blue-50 text-blue-700 border-blue-200";
    case "UNDER_REVIEW": return "bg-amber-50 text-amber-700 border-amber-200";
    case "ACCEPTED":
    case "IN_PROGRESS": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "COMPLETED": return "bg-purple-50 text-purple-700 border-purple-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const getProjectStatusBadge = (status: string): { cls: string; label: string } => {
  switch (status) {
    case "PLANNING": return { cls: "bg-blue-50 text-blue-800 border-blue-200", label: "Planning" };
    case "BUILDING": return { cls: "bg-amber-50 text-amber-800 border-amber-200", label: "Building" };
    case "PILOTING": return { cls: "bg-violet-50 text-violet-800 border-violet-200", label: "Piloting" };
    case "COMPLETED": return { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Completed" };
    case "ABANDONED": return { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Abandoned" };
    default: return { cls: "bg-slate-100 text-slate-600 border-slate-200", label: status };
  }
};

const getNeedStatusBadge = (status: string) => {
  switch (status) {
    case "OPEN": return "bg-sky-50 text-sky-700 border-sky-200";
    case "COMMITTED": return "bg-amber-50 text-amber-700 border-amber-200";
    case "FULFILLED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const getNeedCategoryIcon = (category: string) => {
  switch (category) {
    case "LAB_EQUIPMENT": return <FlaskConical className="w-4 h-4" />;
    case "TESTING_ANALYSIS": return <Microscope className="w-4 h-4" />;
    case "MANUFACTURING_FABRICATION": return <Cpu className="w-4 h-4" />;
    case "DOMAIN_EXPERTISE_MENTORSHIP": return <BookMarked className="w-4 h-4" />;
    default: return <Target className="w-4 h-4" />;
  }
};

const formatCategory = (s: string) => s.replace(/_/g, " ");

// ─── Component ───────────────────────────────────────────────────────────────

export const UniversityDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"research" | "discover" | "needs" | "proposals" | "activity">("research");
  const [v3Projects, setV3Projects] = useState<any[]>([]);
  const [myNeeds, setMyNeeds] = useState<UniversityNeed[]>([]);
  const [needsLoading, setNeedsLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/university/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Access restricted: This portal requires a UNIVERSITY account.");
        throw new Error(`Failed to load university portal data (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      } else {
        throw new Error(data.error || "Failed to parse dashboard data.");
      }
      // Fetch V3 Research Projects
      try {
        const projRes = await fetch(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          if (projData.success && Array.isArray(projData.projects)) {
            setV3Projects(projData.projects.filter((p: any) =>
              !p.trackType || p.trackType === "ACADEMIC_RESEARCH"
            ));
          }
        }
      } catch (e) {
        console.warn("Could not load research projects:", e);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchMyNeeds = useCallback(async () => {
    if (!token) return;
    setNeedsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/university/my-needs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.needs)) setMyNeeds(data.needs);
      }
    } catch (e) {
      console.warn("Could not load university needs:", e);
    } finally {
      setNeedsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { if (activeTab === "needs") fetchMyNeeds(); }, [activeTab, fetchMyNeeds]);

  // Derived stats from v3 projects
  const totalPilots = v3Projects.reduce((s, p) => s + (p._count?.pilots ?? (p.pilots || []).length), 0);

  const TAB_CONFIG = [
    { id: "research" as const, label: "Research Projects", icon: <FlaskConical className="w-4 h-4" />, count: v3Projects.length },
    { id: "discover" as const, label: "Civic Discovery", icon: <Sparkles className="w-4 h-4" />, count: dashboardData?.recommendedProblems.length ?? 0 },
    { id: "needs" as const, label: "Technical Needs", icon: <Microscope className="w-4 h-4" />, count: myNeeds.length },
    { id: "proposals" as const, label: "Proposals", icon: <BookOpen className="w-4 h-4" />, count: dashboardData?.myProposals.length ?? 0 },
    { id: "activity" as const, label: "Activity", icon: <Activity className="w-4 h-4" />, count: dashboardData?.recentActivity.length ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">CB</div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-900 rounded-full">
                  Research &amp; Innovation Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Academic Problem Discovery · Research Projects · Field Pilots · Civic Impact
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/exchange" className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-colors">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" /><span className="hidden sm:inline">Resource Exchange</span>
            </Link>
            <Link to="/problems" className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-colors">
              <Layers className="w-4 h-4 text-indigo-600" /><span className="hidden sm:inline">Problem Bank</span>
            </Link>
            <button onClick={logout} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors" title="Logout">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">

        {isLoading && (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Loading Research &amp; Innovation Portal...</p>
            <p className="text-xs text-slate-500">Fetching civic problems, research projects, and field data.</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3 text-rose-900 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h3 className="font-bold text-sm">Failed to Load University Portal</h3>
              <p className="mt-1">{error}</p>
              <button onClick={fetchDashboardData} className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /><span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && dashboardData && (
          <>
            {/* Identity Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
                    <GraduationCap className="w-7 h-7 text-white" />
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
                      Research Lead: <strong className="text-slate-800">{user?.name}</strong>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        {dashboardData.organization?.district || "Jharkhand"}, {dashboardData.organization?.state || "Jharkhand"}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-indigo-700 flex items-center gap-1">
                        <Rocket className="w-3 h-3" /> Research &amp; Innovation Partner
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />UNIVERSITY ROLE
                  </span>
                  <Link to="/problems" className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm">
                    <span>Discover Problems</span><ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              {((dashboardData.organization?.domainTags?.length > 0) || (dashboardData.organization?.expertiseTags?.length > 0)) && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />Research Focus:
                  </span>
                  {dashboardData.organization.domainTags?.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-lg font-medium text-[11px]">{tag}</span>
                  ))}
                  {dashboardData.organization.expertiseTags?.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-violet-50 text-violet-800 border border-violet-100 rounded-lg font-medium text-[11px]">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Policy Banner */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950">
                <span className="font-bold block text-sm">Open Research Policy (Zero-Gate):</span>
                <p className="mt-0.5 leading-relaxed">
                  Any AI-screened civic problem is immediately actionable. Government verification is advisory — <strong>never a gate</strong>. Initiate Research Projects, publish Technical Needs, and coordinate Field Pilots on any live community problem.
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Research Projects</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-900">{v3Projects.length}</span>
                  <span className="text-xs text-indigo-600 font-medium">active</span>
                </div>
                <p className="text-[11px] text-slate-500">ACADEMIC_RESEARCH track</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider block">Technical Needs</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-violet-900">{myNeeds.length}</span>
                  <span className="text-xs text-violet-600 font-medium">posted</span>
                </div>
                <p className="text-[11px] text-slate-500">Labs, equipment &amp; expertise</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider block">Field Pilots</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-purple-900">{totalPilots}</span>
                  <span className="text-xs text-purple-600 font-medium">deployed</span>
                </div>
                <p className="text-[11px] text-slate-500">On-ground prototype tests</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Civic Engagements</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">{dashboardData.stats.expressedInterestCount}</span>
                  <span className="text-xs text-emerald-600 font-medium">problems</span>
                </div>
                <p className="text-[11px] text-slate-500">Issues engaged via proposals</p>
              </div>
            </div>

            {/* Tab Nav */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {TAB_CONFIG.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"}`}>
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-700"}`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* ── TAB: RESEARCH PROJECTS ── */}
            {activeTab === "research" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-indigo-600" />My Research Projects
                    </h3>
                    <p className="text-xs text-slate-500">ACADEMIC_RESEARCH projects led by {dashboardData.organization?.name || "your institution"}.</p>
                  </div>
                  <Link to="/problems" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors self-start sm:self-auto shadow-sm">
                    <Plus className="w-3.5 h-3.5" /><span>Initiate Research Project</span>
                  </Link>
                </div>
                {v3Projects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <FlaskConical className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">No Research Projects initiated yet.</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Discover a civic problem and initiate an Academic Research Project to coordinate your team, define milestones, post technical needs, and deploy field pilots.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <Link to="/problems" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
                        <Layers className="w-4 h-4" /><span>Browse Problem Bank</span>
                      </Link>
                      <button onClick={() => setActiveTab("discover")} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                        <Sparkles className="w-4 h-4 text-indigo-500" /><span>See Recommendations</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {v3Projects.map((proj) => {
                      const { cls, label } = getProjectStatusBadge(proj.status);
                      return (
                        <div key={proj.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>{label}</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                                  {(proj.trackType || "ACADEMIC_RESEARCH").replace(/_/g, " ")}
                                </span>
                                {proj.leadOrg?.district && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{proj.leadOrg.district}</span>
                                )}
                              </div>
                              <h4 className="text-base font-bold text-slate-900">{proj.title}</h4>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{proj.executiveSummary}</p>
                            </div>
                            <Link to={`/projects/${proj.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors self-start shadow-sm shrink-0">
                              <span>Open Project Dossier</span><ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100">
                            <div className="bg-slate-50 p-2.5 rounded-xl text-xs">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Problems</span>
                              <strong className="text-slate-900 text-sm">{(proj.problems || []).length}</strong>
                            </div>
                            <div className="bg-violet-50 p-2.5 rounded-xl text-xs">
                              <span className="text-violet-500 block text-[10px] uppercase font-semibold mb-0.5">Tech Needs</span>
                              <strong className="text-violet-900 text-sm">{proj._count?.needs ?? (proj.needs || []).length}</strong>
                            </div>
                            <div className="bg-purple-50 p-2.5 rounded-xl text-xs">
                              <span className="text-purple-500 block text-[10px] uppercase font-semibold mb-0.5">Field Pilots</span>
                              <strong className="text-purple-900 text-sm">{proj._count?.pilots ?? (proj.pilots || []).length}</strong>
                            </div>
                            <div className="bg-emerald-50 p-2.5 rounded-xl text-xs">
                              <span className="text-emerald-500 block text-[10px] uppercase font-semibold mb-0.5">Collaborations</span>
                              <strong className="text-emerald-900 text-sm">{proj._count?.collaborations ?? (proj.collaborations || []).length}</strong>
                            </div>
                          </div>
                          {proj.milestones && proj.milestones.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-2">
                                <ListChecks className="w-3.5 h-3.5 text-indigo-600" />Milestones ({proj.milestones.length})
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {proj.milestones.slice(0, 4).map((m: any) => (
                                  <span key={m.id} className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                                    m.status === "VERIFIED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    m.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    m.status === "SUBMITTED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}>{m.title}</span>
                                ))}
                                {proj.milestones.length > 4 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                                    +{proj.milestones.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: CIVIC DISCOVERY ── */}
            {activeTab === "discover" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />Civic Problem Discovery
                    </h3>
                    <p className="text-xs text-slate-500">Problems ranked by match to your institution's research domains, expertise, and geography.</p>
                  </div>
                  <Link to="/problems" className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 self-start sm:self-auto">
                    <span>View all statewide problems</span><ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {dashboardData.recommendedProblems.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No active problems match current criteria.</p>
                    <Link to="/problems" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
                      <Layers className="w-4 h-4" /><span>Browse Statewide Bank</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.recommendedProblems.map((prob) => (
                      <div key={prob.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold rounded-lg">{prob.category}</span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-slate-400" />{prob.district}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {prob.verificationStatus === "GOVERNMENT_VERIFIED" ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-[10px] flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />Gov Verified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-medium text-[10px]">AI-Screened</span>
                              )}
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${getPriorityBadgeClass(prob.priorityTier)}`}>
                                {prob.priorityTier} ({Math.round(prob.priorityScore)})
                              </span>
                            </div>
                          </div>
                          <div>
                            <Link to={`/problems/${prob.id}`} className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2">{prob.title}</Link>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{prob.description}</p>
                          </div>
                          {prob.aiAnalysis?.aiSummary && (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic line-clamp-2">"{prob.aiAnalysis.aiSummary}"</div>
                          )}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-600" />Research Fit:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {prob.matchReasons.map((reason, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-md font-medium text-[10px]">{reason}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            {prob.hasExpressedInterest ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />Proposal Submitted
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-medium">Open for Research</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link to={`/problems/${prob.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                              <span>View</span><ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            <Link to={`/problems/${prob.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
                              <Rocket className="w-3.5 h-3.5" /><span>Start Research</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: TECHNICAL NEEDS ── */}
            {activeTab === "needs" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Microscope className="w-4 h-4 text-indigo-600" />Technical Needs
                    </h3>
                    <p className="text-xs text-slate-500">Labs, equipment, testing facilities, and domain expertise needed for active research.</p>
                  </div>
                  <Link to="/exchange" className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm self-start sm:self-auto">
                    <Plus className="w-3.5 h-3.5" /><span>Post New Need</span>
                  </Link>
                </div>
                {needsLoading ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">Loading technical needs...</p>
                  </div>
                ) : myNeeds.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 flex items-center justify-center">
                      <Microscope className="w-8 h-8 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">No technical needs posted yet.</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Use the Resource Exchange to publish needs for lab access, testing equipment, domain experts, or fabrication facilities.
                      </p>
                    </div>
                    <Link to="/exchange" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors">
                      <ArrowRightLeft className="w-4 h-4" /><span>Go to Resource Exchange</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myNeeds.map((need) => (
                      <div key={need.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-violet-300 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getNeedStatusBadge(need.status)}`}>{need.status}</span>
                              {need.urgency === "CRITICAL_PATH" && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <Zap className="w-3 h-3" />CRITICAL PATH
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-lg">
                                {getNeedCategoryIcon(need.category)}{formatCategory(need.category)}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{need.title}</h4>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{need.details}</p>
                            {need.project && (
                              <p className="text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                                <FlaskConical className="w-3 h-3" />Linked to:{" "}
                                <Link to={`/projects/${need.project.id}`} className="underline hover:text-indigo-900">{need.project.title}</Link>
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-slate-400">
                            {need.district && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{need.district}</span>}
                            <span>{new Date(need.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: PROPOSALS ── */}
            {activeTab === "proposals" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />Research Proposals
                    </h3>
                    <p className="text-xs text-slate-500">Formal proposals submitted by {dashboardData.organization?.name || "your institution"}.</p>
                  </div>
                </div>
                {dashboardData.myProposals.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
                    <Send className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No proposals submitted yet.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">Open a civic problem and submit a formal research proposal for government review.</p>
                    <button onClick={() => setActiveTab("discover")} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
                      <Sparkles className="w-4 h-4" /><span>Discover Problems</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.myProposals.map((prop) => (
                      <div key={prop.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getProposalStatusBadge(prop.status)}`}>{prop.status}</span>
                              {prop.problem?.district && <span className="text-xs font-medium text-slate-500">{prop.problem.district}</span>}
                              {prop.problem?.category && <span className="text-xs font-medium text-slate-500">• {prop.problem.category}</span>}
                            </div>
                            <h4 className="text-base font-bold text-slate-900">{prop.title || prop.deliverables || "Research Proposal"}</h4>
                            {prop.problem && (
                              <p className="text-xs text-indigo-700 font-medium">
                                Target:{" "}
                                <Link to={`/problems/${prop.problemId}`} className="underline hover:text-indigo-900">{prop.problem.title}</Link>
                              </p>
                            )}
                          </div>
                          <Link to={`/problems/${prop.problemId}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-xl transition-colors self-start">
                            <span>View Problem</span><ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div><span className="text-slate-500 block font-medium">Faculty Lead:</span><span className="text-slate-900 font-semibold">{prop.facultyMentor}</span></div>
                          <div><span className="text-slate-500 block font-medium">Submitted:</span><span className="text-slate-900 font-semibold">{new Date(prop.createdAt).toLocaleDateString()}</span></div>
                          <div><span className="text-slate-500 block font-medium">Last Activity:</span><span className="text-slate-900 font-semibold">{new Date(prop.updatedAt).toLocaleDateString()}</span></div>
                        </div>
                        <div className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">Research Approach:</strong>
                          <p className="line-clamp-3">{prop.proposedApproach}</p>
                        </div>
                        {prop.progressUpdates && prop.progressUpdates.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5 text-indigo-600" />Recent Updates ({prop.progressUpdates.length}):
                            </span>
                            <div className="space-y-1.5">
                              {prop.progressUpdates.slice(0, 2).map((u) => (
                                <div key={u.id} className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs flex items-start justify-between gap-2">
                                  <div>
                                    {u.milestoneTitle && <span className="font-bold text-indigo-900 block">{u.milestoneTitle}</span>}
                                    <p className="text-slate-700 mt-0.5">{u.updateText}</p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(u.createdAt).toLocaleDateString()}</span>
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

            {/* ── TAB: ACTIVITY ── */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />Institutional Progress Timeline
                  </h3>
                  <p className="text-xs text-slate-500">Chronological audit of milestones, prototype updates, and progress logs.</p>
                </div>
                {dashboardData.recentActivity.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No activity logged yet.</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Once proposals are active, project leads can post milestone updates from the Problem Details page.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dashboardData.recentActivity.map((act) => (
                      <div key={act.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold text-[10px]">Update</span>
                            {act.milestoneTitle && <span className="font-bold text-slate-900">{act.milestoneTitle}</span>}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{act.updateText}</p>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Problem:{" "}<Link to={`/problems/${act.problemId}`} className="font-medium text-indigo-700 hover:underline">{act.problemTitle || "Civic Problem"}</Link></span>
                            {act.postedBy?.name && <><span>•</span><span>By {act.postedBy.name}</span></>}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">{new Date(act.createdAt).toLocaleDateString()}</span>
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
