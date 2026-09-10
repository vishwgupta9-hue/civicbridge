import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  LogOut,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  AlertTriangle,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Info,
  ExternalLink,
  Sliders,
  RotateCcw,
  HelpCircle,
  BarChart3,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Check,
  Rocket,
} from "lucide-react";

interface VerificationItem {
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
  createdAt: string;
  verificationNotes?: string | null;
  aiAnalysis?: {
    id: string;
    aiSummary?: string;
    predictedCategory?: string;
    confidenceScore?: number;
    severityScore?: number;
    affectedPeopleScore?: number;
    frequencyScore?: number;
    evidenceScore?: number;
    urgencyScore?: number;
    aiUrgencyScore?: number;
    aiUrgencyReason?: string;
    isDuplicate?: boolean;
    duplicateSimilarity?: number | null;
  } | null;
  validation?: {
    id: string;
    severityScore: number;
    affectedScore: number;
    frequencyScore: number;
    evidenceScore: number;
    urgencyScore: number;
    decision: string;
    remarks?: string | null;
    reviewedAt: string;
    reviewedBy?: {
      id: string;
      name: string;
      role: string;
      district: string;
    } | null;
  } | null;
  submittedBy?: {
    id: string;
    name: string;
    role: string;
    district: string;
  } | null;
}

interface AnalyticsData {
  volume: {
    totalProblems: number;
    recentProblems: number;
    aiScreenedPassed: number;
    aiRejected: number;
    aiPending: number;
    governmentVerified: number;
    governmentDeclined: number;
    awaitingReview: number;
  };
  priority: {
    high: number;
    medium: number;
    low: number;
    averagePriorityScore: number;
    highPriorityByDistrict: Record<string, number>;
    highPriorityByCategory: Record<string, number>;
  };
  geography: {
    problemsByDistrict: Array<{
      district: string;
      count: number;
      affectedPopulation: number;
      avgPriority: number;
      highPriorityCount: number;
    }>;
  };
  category: {
    problemsByCategory: Array<{
      category: string;
      count: number;
      avgPriority: number;
      highPriorityCount: number;
    }>;
  };
  solutionEcosystem: {
    universityProposals: number;
    activeProposals: number;
    completedProposals: number;
    startupConcepts: number;
    activeConcepts: number;
    industryCollaborations: number;
    activeCollaborations: number;
    totalProgressUpdates: number;
    totalSupportRequests: number;
    pendingSupportRequests: number;
    problemsWithSolutions: number;
  };
  pipeline: {
    reported: number;
    aiScreened: number;
    governmentReviewRequested: number;
    institutionalInterest: number;
    activeSolutions: number;
    pilotedOrResolved: number;
  };
  signals: {
    highPriorityNoAction: {
      count: number;
      description: string;
      items: Array<{
        id: string;
        title: string;
        district: string;
        category: string;
        priorityScore: number;
        priorityTier: string;
        affectedCount: number;
      }>;
    };
    awaitingGovtVerification: {
      count: number;
      description: string;
      items: Array<{
        id: string;
        title: string;
        district: string;
        category: string;
        priorityScore: number;
        priorityTier: string;
        affectedCount: number;
      }>;
    };
    highPopulationUnaddressed: {
      count: number;
      description: string;
      items: Array<{
        id: string;
        title: string;
        district: string;
        category: string;
        affectedCount: number;
        priorityScore: number;
        priorityTier?: string;
      }>;
    };
    staleProjects: {
      count: number;
      description: string;
      items: Array<{
        id: string;
        title: string;
        district: string;
        category: string;
        priorityScore: number;
        updatedAt: string;
      }>;
    };
    pendingSupportRequests: {
      count: number;
      description: string;
      items: Array<{
        id: string;
        requestType: string;
        requestedFrom: string;
        details: string;
        problemId: string;
        problemTitle: string;
        startupName: string;
      }>;
    };
  };
  topProblems: Array<{
    id: string;
    title: string;
    district: string;
    category: string;
    subCategory?: string | null;
    priorityScore: number;
    priorityTier: string;
    affectedCount: number;
    verificationStatus: string;
    proposalsCount: number;
    businessConceptsCount: number;
    collaborationsCount: number;
    status: string;
  }>;
  explainability: {
    aiRole: string;
    priorityFormula: string;
    aggregationMethod: string;
    signalsMethod: string;
  };
}

const JHARKHAND_DISTRICTS = [
  "Ranchi", "Dhanbad", "Giridih", "East Singhbhum", "Bokaro", "Palamu",
  "Hazaribagh", "Deoghar", "West Singhbhum", "Garhwa", "Dumka", "Godda",
  "Sahebganj", "Seraikela Kharsawan", "Chatra", "Gumla", "Ramgarh", "Pakur",
  "Jamtara", "Latehar", "Simdega", "Lohardaga", "Khunti", "Koderma",
];

const CATEGORIES = [
  "Water & Sanitation",
  "Rural Roads",
  "Clean Tech",
  "Public Safety & Lighting",
  "Agriculture & Irrigation",
  "Health & Nutrition",
  "Education",
  "Commercial",
  "Others",
];

// 5 Priority calculation weights
const WEIGHTS = {
  severity: 0.25,
  affected: 0.25,
  frequency: 0.15,
  evidence: 0.15,
  urgency: 0.2,
};

function computePriority(s: number, a: number, f: number, e: number, u: number) {
  const raw =
    s * WEIGHTS.severity +
    a * WEIGHTS.affected +
    f * WEIGHTS.frequency +
    e * WEIGHTS.evidence +
    u * WEIGHTS.urgency;
  const score = Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
  let tier: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (score >= 70) tier = "HIGH";
  else if (score >= 40) tier = "MEDIUM";
  return { score, tier };
}

export const AdminDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  // Navigation View: 'analytics' | 'queue'
  const [activeView, setActiveView] = useState<"analytics" | "queue">("analytics");

  // Analytics Data & Filters
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedVerification, setSelectedVerification] = useState<string>("ALL");

  // Queue Data
  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Modal / Verification Review State
  const [activeProblem, setActiveProblem] = useState<VerificationItem | null>(null);
  const [decision, setDecision] = useState<"VERIFY" | "REJECT" | "REQUEST_MORE_INFO">("VERIFY");
  const [remarks, setRemarks] = useState("");
  const [severityScore, setSeverityScore] = useState<number>(50);
  const [affectedScore, setAffectedScore] = useState<number>(50);
  const [frequencyScore, setFrequencyScore] = useState<number>(50);
  const [evidenceScore, setEvidenceScore] = useState<number>(50);
  const [urgencyScore, setUrgencyScore] = useState<number>(50);

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Fetch Statewide Analytics
  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    const queryParams = new URLSearchParams();
    if (selectedDistrict !== "ALL") queryParams.append("district", selectedDistrict);
    if (selectedCategory !== "ALL") queryParams.append("category", selectedCategory);
    if (selectedPriority !== "ALL") queryParams.append("priorityTier", selectedPriority);
    if (selectedVerification !== "ALL") queryParams.append("verificationStatus", selectedVerification);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load administrative analytics.");
      }
      setAnalytics(data.data);
    } catch (err: any) {
      setAnalyticsError(err.message || "Failed to connect to analytics service.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token, selectedDistrict, selectedCategory, selectedPriority, selectedVerification]);

  // Fetch Verification Queue
  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setQueueLoading(true);
    setQueueError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/verification-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load verification queue.");
      }
      setQueue(data.queue || []);
    } catch (err: any) {
      setQueueError(err.message || "Failed to load verification queue.");
    } finally {
      setQueueLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
    fetchQueue();
  }, [fetchAnalytics, fetchQueue]);

  // Open modal with pre-filled scores from problem
  const handleOpenReview = (
    problem: VerificationItem,
    initialDecision: "VERIFY" | "REJECT" | "REQUEST_MORE_INFO" = "VERIFY"
  ) => {
    setActiveProblem(problem);
    setDecision(initialDecision);
    setRemarks(problem.validation?.remarks || "");
    setModalError(null);

    const s = problem.validation?.severityScore ?? problem.aiAnalysis?.severityScore ?? 50;
    const a = problem.validation?.affectedScore ?? problem.aiAnalysis?.affectedPeopleScore ?? 50;
    const f = problem.validation?.frequencyScore ?? problem.aiAnalysis?.frequencyScore ?? 50;
    const e = problem.validation?.evidenceScore ?? problem.aiAnalysis?.evidenceScore ?? 50;
    const u = problem.validation?.urgencyScore ?? problem.aiAnalysis?.urgencyScore ?? 50;

    setSeverityScore(s);
    setAffectedScore(a);
    setFrequencyScore(f);
    setEvidenceScore(e);
    setUrgencyScore(u);
  };

  const handleResetToAi = () => {
    if (!activeProblem) return;
    setSeverityScore(activeProblem.aiAnalysis?.severityScore ?? 50);
    setAffectedScore(activeProblem.aiAnalysis?.affectedPeopleScore ?? 50);
    setFrequencyScore(activeProblem.aiAnalysis?.frequencyScore ?? 50);
    setEvidenceScore(activeProblem.aiAnalysis?.evidenceScore ?? 50);
    setUrgencyScore(activeProblem.aiAnalysis?.urgencyScore ?? 50);
  };

  const { score: computedScore, tier: computedTier } = computePriority(
    severityScore,
    affectedScore,
    frequencyScore,
    evidenceScore,
    urgencyScore
  );

  const handleConfirmVerification = async () => {
    if (!activeProblem || !token) return;
    setIsSubmittingAction(true);
    setModalError(null);

    const payload = {
      severityScore,
      affectedScore,
      frequencyScore,
      evidenceScore,
      urgencyScore,
      decision,
      remarks: remarks.trim(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/admin/problems/${activeProblem.id}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process verification decision.");
      }

      if (decision === "VERIFY" || decision === "REJECT") {
        setQueue((prev) => prev.filter((item) => item.id !== activeProblem.id));
      } else {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === activeProblem.id
              ? {
                  ...item,
                  priorityScore: data.problem.priorityScore,
                  priorityTier: data.problem.priorityTier,
                  verificationNotes: data.problem.verificationNotes,
                  validation: data.validation,
                }
              : item
          )
        );
      }

      setActiveProblem(null);
      await fetchAnalytics();

      setToastMessage({
        type: "success",
        text: `Verification decision recorded for "${activeProblem.title.slice(0, 40)}..."`,
      });
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setModalError(err.message || "Operation failed.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const resetFilters = () => {
    setSelectedDistrict("ALL");
    setSelectedCategory("ALL");
    setSelectedPriority("ALL");
    setSelectedVerification("ALL");
  };

  const getPriorityColor = (tier: string) => {
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

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return "bg-rose-600 text-white";
    if (score >= 40) return "bg-amber-500 text-white";
    return "bg-slate-600 text-white";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                  Statewide Governance Command
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Jharkhand Civic Intelligence, Priority Analytics & Verification Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <Layers className="w-4 h-4 text-amber-800" />
              <span>Problem Bank</span>
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* User Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-lg">
              Role: ADMIN (Government of Jharkhand)
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
              Jurisdiction: Statewide (24 Districts)
            </span>
          </div>
        </div>

        {/* Toast Messages */}
        {toastMessage && (
          <div className="p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {/* Top Views Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveView("analytics")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all min-h-[44px] ${
              activeView === "analytics"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statewide Civic Intelligence & Analytics</span>
          </button>

          <button
            onClick={() => setActiveView("queue")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all min-h-[44px] ${
              activeView === "queue"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Government Verification Queue</span>
            {queue.length > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                activeView === "queue" ? "bg-amber-800 text-white" : "bg-amber-100 text-amber-900"
              }`}>
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* ===================================================================== */}
        {/* VIEW 1: STATEWIDE CIVIC INTELLIGENCE & ANALYTICS                     */}
        {/* ===================================================================== */}
        {activeView === "analytics" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Multi-Factor Governance Filters
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={fetchAnalytics}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? "animate-spin" : ""}`} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* District Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 min-h-[44px]"
                  >
                    <option value="ALL">All 24 Districts</option>
                    {JHARKHAND_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Domain / Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 min-h-[44px]"
                  >
                    <option value="ALL">All Categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Tier Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Priority Tier</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 min-h-[44px]"
                  >
                    <option value="ALL">All Priority Tiers</option>
                    <option value="HIGH">HIGH (70–100)</option>
                    <option value="MEDIUM">MEDIUM (40–69.9)</option>
                    <option value="LOW">LOW (0–39.9)</option>
                  </select>
                </div>

                {/* Verification Status Filter */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Verification Status</label>
                  <select
                    value={selectedVerification}
                    onChange={(e) => setSelectedVerification(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-600 min-h-[44px]"
                  >
                    <option value="ALL">All Verification States</option>
                    <option value="AI_SCREENED">AI Screened (Actionable)</option>
                    <option value="GOVERNMENT_VERIFIED">Government Verified</option>
                    <option value="DECLINED_BY_GOVT">Declined by Govt</option>
                  </select>
                </div>
              </div>
            </div>

            {analyticsError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{analyticsError}</span>
              </div>
            )}

            {/* KPI Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total Problems</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {analytics?.volume.totalProblems ?? (analyticsLoading ? "..." : 0)}
                </p>
                <span className="text-[11px] text-slate-400 block">
                  {analytics?.volume.recentProblems ?? 0} in last 30 days
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">High Priority</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                  {analytics?.priority.high ?? (analyticsLoading ? "..." : 0)}
                </p>
                <span className="text-[11px] text-slate-400 block">
                  Avg: {analytics?.priority.averagePriorityScore ?? 0}/100
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">AI Screened</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-teal-700">
                  {analytics?.volume.aiScreenedPassed ?? (analyticsLoading ? "..." : 0)}
                </p>
                <span className="text-[11px] text-teal-700 block font-medium">Passed Relevance</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Govt Verified</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                  {analytics?.volume.governmentVerified ?? (analyticsLoading ? "..." : 0)}
                </p>
                <span className="text-[11px] text-slate-400 block">
                  {analytics?.volume.governmentDeclined ?? 0} declined
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Active Solvers</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                  {analytics?.solutionEcosystem.problemsWithSolutions ?? (analyticsLoading ? "..." : 0)}
                </p>
                <span className="text-[11px] text-slate-400 block">Issues with solver action</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Pilots & Impact</span>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">
                  {analytics?.pipeline.pilotedOrResolved ?? (analyticsLoading ? "..." : 0)}
                </p>
                <span className="text-[11px] text-slate-400 block">Deployments delivered</span>
              </div>
            </div>

            {/* Innovation Pipeline Lifecycle Funnel */}
            {analytics?.pipeline && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Civic Innovation Lifecycle Pipeline
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Intake $\rightarrow$ Resolution Funnel</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Intake</span>
                    <span className="text-xl font-extrabold text-slate-900">{analytics.pipeline.reported}</span>
                    <span className="text-[10px] text-slate-400 block">Reports Filed</span>
                  </div>

                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-center">
                    <span className="text-[10px] font-bold text-teal-800 uppercase block">2. AI Screened</span>
                    <span className="text-xl font-extrabold text-teal-900">{analytics.pipeline.aiScreened}</span>
                    <span className="text-[10px] text-teal-600 block">Passed Filter</span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">3. Govt Review</span>
                    <span className="text-xl font-extrabold text-amber-900">{analytics.pipeline.governmentReviewRequested}</span>
                    <span className="text-[10px] text-amber-600 block">Flagged / Endorsed</span>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block">4. Solvers Engaged</span>
                    <span className="text-xl font-extrabold text-indigo-900">{analytics.pipeline.institutionalInterest}</span>
                    <span className="text-[10px] text-indigo-600 block">Proposals & Concepts</span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">5. Active Building</span>
                    <span className="text-xl font-extrabold text-blue-900">{analytics.pipeline.activeSolutions}</span>
                    <span className="text-[10px] text-blue-600 block">In-Progress Work</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">6. Piloted / Resolved</span>
                    <span className="text-xl font-extrabold text-emerald-900">{analytics.pipeline.pilotedOrResolved}</span>
                    <span className="text-[10px] text-emerald-600 block">Verified Impact</span>
                  </div>
                </div>
              </div>
            )}

            {/* STUCK / ATTENTION SIGNALS PANEL */}
            {analytics?.signals && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Statewide Administrative Attention Signals
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Rule-Based Governance Flags
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Signal 1: High Priority with No Institutional Solvers */}
                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Critical Issues Lacking Solvers ({analytics.signals.highPriorityNoAction.count})
                      </span>
                      <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                        High Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-800">
                      High-priority civic issues with zero university proposals, startup concepts, or industry collaborations.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {analytics.signals.highPriorityNoAction.items.length === 0 ? (
                        <span className="text-xs text-rose-700 italic">No unattended critical problems.</span>
                      ) : (
                        analytics.signals.highPriorityNoAction.items.slice(0, 3).map((item) => (
                          <Link
                            key={item.id}
                            to={`/problems/${item.id}`}
                            className="block p-2 bg-white rounded-lg border border-rose-100 hover:border-rose-300 text-xs text-slate-800 font-medium transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold line-clamp-1">{item.title}</span>
                              <span className="text-[10px] text-rose-600 font-bold shrink-0 ml-2">
                                {item.priorityScore}/100
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {item.district} • {item.affectedCount} affected
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Signal 2: Awaiting Official Government Verification */}
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Awaiting Government Review ({analytics.signals.awaitingGovtVerification.count})
                      </span>
                      <button
                        onClick={() => setActiveView("queue")}
                        className="text-[10px] font-bold text-amber-900 underline"
                      >
                        Open Queue
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Problems that have requested district administration validation and verification.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {analytics.signals.awaitingGovtVerification.items.length === 0 ? (
                        <span className="text-xs text-amber-700 italic">No problems awaiting review.</span>
                      ) : (
                        analytics.signals.awaitingGovtVerification.items.slice(0, 3).map((item) => (
                          <Link
                            key={item.id}
                            to={`/problems/${item.id}`}
                            className="block p-2 bg-white rounded-lg border border-amber-100 hover:border-amber-300 text-xs text-slate-800 font-medium transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold line-clamp-1">{item.title}</span>
                              <span className="text-[10px] text-amber-700 font-bold shrink-0 ml-2">
                                Score: {item.priorityScore}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {item.district} • {item.category}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Signal 3: Large Population Unaddressed (1000+ affected) */}
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        Mass-Impact Issues (1,000+ Citizens) ({analytics.signals.highPopulationUnaddressed.count})
                      </span>
                      <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">
                        High Population
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Problems affecting large population clusters where no active solver engagement exists.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {analytics.signals.highPopulationUnaddressed.items.length === 0 ? (
                        <span className="text-xs text-blue-700 italic">No unaddressed mass-impact problems.</span>
                      ) : (
                        analytics.signals.highPopulationUnaddressed.items.slice(0, 3).map((item) => (
                          <Link
                            key={item.id}
                            to={`/problems/${item.id}`}
                            className="block p-2 bg-white rounded-lg border border-blue-100 hover:border-blue-300 text-xs text-slate-800 font-medium transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold line-clamp-1">{item.title}</span>
                              <span className="text-[10px] text-blue-700 font-bold shrink-0 ml-2">
                                {item.affectedCount.toLocaleString()} affected
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {item.district} • Tier {item.priorityTier}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Signal 4: Pending Startup Support Requests */}
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Rocket className="w-4 h-4 text-purple-600" />
                        Pending Startup Support Requests ({analytics.signals.pendingSupportRequests.count})
                      </span>
                      <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded">
                        Action Required
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      Requests filed by civic startups awaiting institutional validation or scheme endorsement.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {analytics.signals.pendingSupportRequests.items.length === 0 ? (
                        <span className="text-xs text-purple-700 italic">No pending support requests.</span>
                      ) : (
                        analytics.signals.pendingSupportRequests.items.slice(0, 3).map((item) => (
                          <Link
                            key={item.id}
                            to={`/problems/${item.problemId}`}
                            className="block p-2 bg-white rounded-lg border border-purple-100 hover:border-purple-300 text-xs text-slate-800 font-medium transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold line-clamp-1">{item.requestType}</span>
                              <span className="text-[10px] text-purple-700 font-bold shrink-0 ml-2">
                                To: {item.requestedFrom}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Startup: {item.startupName} • Problem: {item.problemTitle}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Geographical & Category Distributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribution 1: Problems by District */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Geographic Density by District</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Total & High-Priority</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {analytics?.geography.problemsByDistrict.slice(0, 6).map((dist) => {
                    const maxCount = analytics.geography.problemsByDistrict[0]?.count || 1;
                    const pct = Math.round((dist.count / maxCount) * 100);
                    return (
                      <div key={dist.district} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-800">
                          <span>{dist.district}</span>
                          <span className="text-slate-500">
                            {dist.count} problems ({dist.highPriorityCount} High) • {dist.affectedPopulation.toLocaleString()} citizens
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-amber-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distribution 2: Problems by Category */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Domain & Category Breakdown</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Volume by Subject</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {analytics?.category.problemsByCategory.slice(0, 6).map((cat) => {
                    const maxCatCount = analytics.category.problemsByCategory[0]?.count || 1;
                    const pct = Math.round((cat.count / maxCatCount) * 100);
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-800">
                          <span>{cat.category}</span>
                          <span className="text-slate-500">
                            {cat.count} problems • Avg Score: {cat.avgPriority}/100
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                          <div
                            className="bg-teal-700 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* TOP HIGH-PRIORITY CIVIC PROBLEMS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Highest-Priority Civic Challenges</h3>
                  <p className="text-xs text-slate-500">
                    Ranked statewide by normalized 5-factor priority formula with active institutional solver metrics.
                  </p>
                </div>
                <Link
                  to="/problems"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900"
                >
                  <span>View All Problems in Bank</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Problem Title</th>
                      <th className="py-2.5 px-3">District</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Affected Citizens</th>
                      <th className="py-2.5 px-3">Govt Trust</th>
                      <th className="py-2.5 px-3">Solvers (U/S/I)</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!analytics?.topProblems || analytics.topProblems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No problems match current filters.
                        </td>
                      </tr>
                    ) : (
                      analytics.topProblems.map((prob) => (
                        <tr key={prob.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getScoreBadgeColor(prob.priorityScore)}`}>
                              {prob.priorityScore}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs font-bold text-slate-900 line-clamp-1">
                            {prob.title}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                            {prob.district}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                            {prob.category}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                            {prob.affectedCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {prob.verificationStatus === "GOVERNMENT_VERIFIED" ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                                Verified
                              </span>
                            ) : prob.verificationStatus === "DECLINED_BY_GOVT" ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                                Declined
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded">
                                AI Screened
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono">
                            {prob.proposalsCount} / {prob.businessConceptsCount} / {prob.collaborationsCount}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-right">
                            <Link
                              to={`/problems/${prob.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors min-h-[36px]"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explainability & Methodology Disclosure */}
            <div className="bg-slate-100/80 rounded-2xl p-5 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                Statewide Governance Analytics Methodology & Explainability Disclosure
              </span>
              <p className="leading-relaxed">
                • <strong>Deterministic Priority:</strong> Calculated strictly via formula: (Severity×0.25) + (Affected×0.25) + (Frequency×0.15) + (Evidence×0.15) + (Urgency×0.20).
              </p>
              <p className="leading-relaxed">
                • <strong>AI Role:</strong> AI generates initial category prediction and normalized factor estimates upon citizen submission. AI does not make executive government decisions.
              </p>
              <p className="leading-relaxed">
                • <strong>Zero-Gate Architecture:</strong> Problems passing automated AI screening remain visible to universities, startups, and industry regardless of verification status.
              </p>
              <p className="leading-relaxed">
                • <strong>Data Source:</strong> All figures are calculated directly via relational database groupings across official CivicBridge records. No machine learning accuracy or F1 claims are made.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* VIEW 2: GOVERNMENT VERIFICATION QUEUE (PHASE 3 WORKFLOW)             */}
        {/* ===================================================================== */}
        {activeView === "queue" && (
          <div className="space-y-6">
            {/* Policy Guidance Alert */}
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-amber-950 text-sm">
                  Government Verification Architecture Guarantee (Zero-Gate)
                </h3>
                <p className="text-amber-900 leading-relaxed">
                  <strong>Government verification is a trust signal, not a gate.</strong> In accordance with CivicBridge principles, high-priority issues are screened by AI and immediately open to universities and startups. Your verification endorsement provides ground validation, while declining verification keeps the problem active for open innovation.
                </p>
              </div>
            </div>

            {/* Verification Queue Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Government Verification Queue
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                      {queue.length} Pending
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    High-priority problems that have passed AI relevance triage and requested district administration review.
                  </p>
                </div>

                <button
                  onClick={fetchQueue}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition-colors self-start sm:self-auto min-h-[44px]"
                >
                  Refresh Queue
                </button>
              </div>

              {/* Queue Body */}
              <div className="p-5 pt-0">
                {queueLoading && (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-500">Loading pending verification queue...</p>
                  </div>
                )}

                {queueError && !queueLoading && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{queueError}</span>
                  </div>
                )}

                {!queueLoading && queue.length === 0 && (
                  <div className="py-12 text-center max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Verification Queue is Empty</h3>
                    <p className="text-xs text-slate-500">
                      No high-priority civic problems currently require government review.
                    </p>
                  </div>
                )}

                {/* Problem Cards in Queue */}
                {!queueLoading && queue.length > 0 && (
                  <div className="space-y-4">
                    {queue.map((problem) => (
                      <div
                        key={problem.id}
                        className="p-5 rounded-xl border border-slate-200 hover:border-amber-300 transition-all bg-white shadow-xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              <Layers className="w-3 h-3 text-slate-500" />
                              {problem.category}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {problem.district}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreBadgeColor(problem.priorityScore)}`}>
                              Score: {problem.priorityScore}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getPriorityColor(problem.priorityTier)}`}>
                              Tier {problem.priorityTier}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {problem.title}
                          </h3>
                          <Link
                            to={`/problems/${problem.id}`}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 min-h-[44px]"
                          >
                            <span>View Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>AI Triage Summary</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {problem.aiAnalysis?.aiSummary || problem.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Affected: <strong className="text-slate-800">{problem.affectedCount} citizens</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Submitted: {new Date(problem.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenReview(problem, "REQUEST_MORE_INFO")}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-amber-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Request Info</span>
                          </button>

                          <button
                            onClick={() => handleOpenReview(problem, "REJECT")}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-rose-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Decline Verification</span>
                          </button>

                          <button
                            onClick={() => handleOpenReview(problem, "VERIFY")}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review & Verify</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5-Factor Admin Verification Modal */}
      {activeProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 my-8 animate-in fade-in">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Government Verification & Factor Assessment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit 5 priority factors, calibrate ground truth, and set official endorsement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveProblem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-sm truncate">
                  {activeProblem.title}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                  {activeProblem.category}
                </span>
              </div>
              <p className="text-slate-600 text-xs line-clamp-2">
                {activeProblem.description}
              </p>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] pt-1">
                <span>📍 {activeProblem.district}</span>
                <span>👥 {activeProblem.affectedCount} citizens affected</span>
              </div>
            </div>

            {/* 5 Factors Adjuster Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>5-Factor Priority Scores (0–100)</span>
                </label>
                <button
                  type="button"
                  onClick={handleResetToAi}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to AI Scores</span>
                </button>
              </div>

              {/* 1. Severity */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">
                    1. Severity Score <span className="text-slate-400 font-normal">(Weight: 25%)</span>
                  </span>
                  <span className="font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                    {severityScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={severityScore}
                  onChange={(e) => setSeverityScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* 2. Affected People */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">
                    2. Affected People Score <span className="text-slate-400 font-normal">(Weight: 25%)</span>
                  </span>
                  <span className="font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                    {affectedScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={affectedScore}
                  onChange={(e) => setAffectedScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* 3. Frequency */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">
                    3. Frequency Score <span className="text-slate-400 font-normal">(Weight: 15%)</span>
                  </span>
                  <span className="font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                    {frequencyScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frequencyScore}
                  onChange={(e) => setFrequencyScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* 4. Evidence */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">
                    4. Supporting Evidence Score <span className="text-slate-400 font-normal">(Weight: 15%)</span>
                  </span>
                  <span className="font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                    {evidenceScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evidenceScore}
                  onChange={(e) => setEvidenceScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* 5. Urgency */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">
                    5. Administrative Urgency Score <span className="text-slate-400 font-normal">(Weight: 20%)</span>
                  </span>
                  <span className="font-bold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900">
                    {urgencyScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={urgencyScore}
                  onChange={(e) => setUrgencyScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>
            </div>

            {/* Resulting Priority Score & Tier */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-900 font-bold block">
                  Resulting Deterministic Priority Score:
                </span>
                <span className="text-2xl font-black text-amber-950">
                  {computedScore} <span className="text-sm font-semibold text-amber-800">/ 100</span>
                </span>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${getPriorityColor(computedTier)}`}>
                Tier: {computedTier}
              </span>
            </div>

            {/* Decision Radio Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Official Verification Action *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision("VERIFY")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    decision === "VERIFY"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-bold">Endorse</span>
                  <span className="block text-[10px] opacity-80">GOVERNMENT_VERIFIED</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision("REJECT")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    decision === "REJECT"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-bold">Decline</span>
                  <span className="block text-[10px] opacity-80">DECLINED_BY_GOVT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision("REQUEST_MORE_INFO")}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    decision === "REQUEST_MORE_INFO"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-bold">More Info</span>
                  <span className="block text-[10px] opacity-80">REQUEST_INFO</span>
                </button>
              </div>
            </div>

            {/* Remarks Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Administrative Verification Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Ground confirmation details, inspection findings, or guidance notes..."
                className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 leading-relaxed"
              />
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveProblem(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleConfirmVerification}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 min-h-[44px]"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmittingAction ? "Processing..." : "Commit Decision"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
