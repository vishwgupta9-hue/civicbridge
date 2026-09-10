import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  Building2,
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
  Handshake,
  Activity,
  HelpCircle,
  X,
  MessageSquare,
  Send,
  PlusCircle,
  Clock,
  Briefcase,
} from "lucide-react";

interface IndustryOrg {
  id: string;
  name: string;
  type: string;
  regCode?: string | null;
  domainTags: string[];
  expertiseTags: string[];
  district?: string | null;
  state: string;
}

interface CollaborationItem {
  id: string;
  supportType: string;
  message: string;
  status: "INTERESTED" | "ACTIVE" | "COMPLETED";
  createdAt: string;
  problem: {
    id: string;
    title: string;
    category: string;
    subCategory?: string | null;
    district: string;
    affectedCount: number;
    priorityScore: number;
    priorityTier: string;
    status: string;
    verificationStatus: string;
  };
}

interface SupportRequestItem {
  id: string;
  requestType: string;
  details: string;
  status: string;
  createdAt: string;
  problem: {
    id: string;
    title: string;
    category: string;
    district: string;
    priorityScore: number;
    priorityTier: string;
    verificationStatus: string;
  };
  startup?: {
    id: string;
    name: string;
    district?: string | null;
    contactEmail?: string;
  };
}

interface RecommendedOpportunity {
  id: string;
  title: string;
  category: string;
  subCategory?: string | null;
  district: string;
  affectedCount: number;
  priorityScore: number;
  priorityTier: string;
  status: string;
  verificationStatus: string;
  aiSummary?: string | null;
  proposalsCount: number;
  businessConceptsCount: number;
  collaborationsCount: number;
  hasCollaborated: boolean;
  matchScore: number;
  matchReasons: string[];
}

interface DashboardData {
  organization: IndustryOrg;
  metrics: {
    totalCollaborations: number;
    activeCollaborations: number;
    interestedCollaborations: number;
    completedCollaborations: number;
    pendingSupportRequests: number;
    approvedSupportRequests: number;
    recommendedOpportunitiesCount: number;
  };
  myCollaborations: CollaborationItem[];
  pendingRequests: SupportRequestItem[];
  recommendedOpportunities: RecommendedOpportunity[];
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    supportType?: string;
    status: string;
    timestamp: string;
    problemId: string;
  }>;
}

export const IndustryDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"opportunities" | "collaborations" | "requests" | "activity">("opportunities");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<RecommendedOpportunity | null>(null);
  const [collabForm, setCollabForm] = useState({
    supportType: "TECHNICAL",
    description: "",
  });

  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequestItem | null>(null);
  const [respondForm, setRespondForm] = useState({
    status: "APPROVED" as "APPROVED" | "REJECTED",
    responseNotes: "",
  });

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<CollaborationItem | null>(null);
  const [progressForm, setProgressForm] = useState({
    status: "ACTIVE",
    updateText: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch Dashboard data from /api/industry/dashboard
  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/industry/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load industry dashboard data.");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend service.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Handle Offer Support submission
  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedProblem) return;
    setSubmitting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/industry/collaborations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          supportType: collabForm.supportType,
          description: collabForm.description,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to register collaboration offer.");
      }

      setActionSuccess(`Collaboration offer registered successfully for "${selectedProblem.title}"!`);
      setShowCollabModal(false);
      setCollabForm({ supportType: "TECHNICAL", description: "" });
      setSelectedProblem(null);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to register collaboration offer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Respond to Startup Support Request
  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedRequest) return;
    setSubmitting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/industry/support-requests/${selectedRequest.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: respondForm.status,
          responseNotes: respondForm.responseNotes,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to respond to support request.");
      }

      setActionSuccess(`Support request marked as ${respondForm.status}!`);
      setShowRespondModal(false);
      setSelectedRequest(null);
      setRespondForm({ status: "APPROVED", responseNotes: "" });
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to respond to support request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Collaboration Progress Update
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCollab) return;
    setSubmitting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/collaborations/${selectedCollab.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: progressForm.status,
          updateText: progressForm.updateText,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to update collaboration progress.");
      }

      setActionSuccess(`Progress logged for "${selectedCollab.problem.title}"!`);
      setShowProgressModal(false);
      setSelectedCollab(null);
      setProgressForm({ status: "ACTIVE", updateText: "" });
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || "Failed to update progress.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (tier: string) => {
    switch (tier) {
      case "HIGH":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "LOW":
      default:
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
  };

  const getSupportTypeBadge = (type: string) => {
    switch (type) {
      case "TECHNICAL":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "MENTORSHIP":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "PROTOTYPING":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "GENERAL_INTEREST":
      default:
        return "bg-slate-50 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">CivicBridge</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-full border border-teal-200">
                  Industry Enterprise Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                CSR, Technical Validation & Civic Venture Partnership Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Problem Bank</span>
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 px-3 py-2 rounded-xl transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Banner: Action Feedback */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-900 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Enterprise Profile Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {data?.organization.name || user?.name}
                  </h2>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                    CIN: {data?.organization.regCode || "Verified Enterprise"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>Lead: <strong>{user?.name}</strong></span>
                  <span>•</span>
                  <span>{user?.email}</span>
                  {data?.organization.district && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {data.organization.district}, {data.organization.state}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors min-h-[44px]"
                title="Refresh Live Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>

          {/* Enterprise Capabilities & Domain Tags */}
          {data?.organization && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-teal-600" /> Domains:
                </span>
                {data.organization.domainTags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-100 rounded-lg text-xs font-semibold">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Facilities:
                </span>
                {data.organization.expertiseTags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zero-Gate Trust Banner */}
        <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h3 className="text-xs font-extrabold text-teal-950 uppercase tracking-wide">
              Zero-Gate Institutional Collaboration Architecture
            </h3>
            <p className="text-xs text-teal-900 leading-relaxed">
              All civic problems passing automated AI screening are discoverable and immediately eligible for industry engagement.
              Government verification is a trust and validation signal, <strong>never a gate or barrier</strong>.
            </p>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Engagements</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {data?.metrics.totalCollaborations ?? (loading ? "..." : 0)}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded">
                All Time
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Collaborations offered or active</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Field Work</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {data?.metrics.activeCollaborations ?? (loading ? "..." : 0)}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Currently in-progress pilots & CSR</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Support Requests</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {data?.metrics.pendingSupportRequests ?? (loading ? "..." : 0)}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                Pending
              </span>
            </div>
            <p className="text-[11px] text-slate-500">From verified civic startups</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Matched Opportunities</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                {data?.metrics.recommendedOpportunitiesCount ?? (loading ? "..." : 0)}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                AI Match
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Tailored to enterprise capabilities</p>
          </div>
        </div>

        {/* Tabbed Main Interface */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 sm:px-6 pt-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("opportunities")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "opportunities"
                  ? "border-teal-600 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Recommended Opportunities</span>
              {data?.recommendedOpportunities && data.recommendedOpportunities.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded-full">
                  {data.recommendedOpportunities.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("collaborations")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "collaborations"
                  ? "border-teal-600 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Handshake className="w-4 h-4 text-teal-600" />
              <span>My Collaborations</span>
              {data?.myCollaborations && data.myCollaborations.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full">
                  {data.myCollaborations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "requests"
                  ? "border-teal-600 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Startup Support Requests</span>
              {data?.metrics.pendingSupportRequests ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {data.metrics.pendingSupportRequests}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === "activity"
                  ? "border-teal-600 text-teal-800"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="w-4 h-4 text-slate-500" />
              <span>Recent Activity</span>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* TAB 1: RECOMMENDED OPPORTUNITIES */}
            {activeTab === "opportunities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Explainable Corporate & CSR Matching
                    </h3>
                    <p className="text-xs text-slate-500">
                      Evaluated deterministically against your registered domain tags, technical facilities, and district presence.
                    </p>
                  </div>
                  <Link
                    to="/problems"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 min-h-[44px]"
                  >
                    <span>View All Statewide Problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <span className="text-xs">Computing opportunity matches...</span>
                  </div>
                ) : !data?.recommendedOpportunities || data.recommendedOpportunities.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No matching opportunities found</p>
                    <p className="text-xs text-slate-500 mt-1">Browse the Problem Bank to explore all civic issues.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.recommendedOpportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Match Score & Government Trust Signal */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 text-xs font-extrabold bg-teal-100 text-teal-900 rounded-lg flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                                {opp.matchScore}% Match
                              </span>
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getPriorityColor(opp.priorityTier)}`}>
                                Tier: {opp.priorityTier} ({opp.priorityScore}/100)
                              </span>
                            </div>

                            {opp.verificationStatus === "GOVERNMENT_VERIFIED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Govt Verified
                              </span>
                            ) : opp.verificationStatus === "DECLINED_BY_GOVT" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                                Community Scope
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                AI Screened
                              </span>
                            )}
                          </div>

                          {/* Problem Title & Geo */}
                          <div>
                            <Link
                              to={`/problems/${opp.id}`}
                              className="text-base font-bold text-slate-900 hover:text-teal-700 transition-colors line-clamp-2"
                            >
                              {opp.title}
                            </Link>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {opp.district}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                {opp.affectedCount.toLocaleString()} affected
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-teal-700">{opp.category}</span>
                            </div>
                          </div>

                          {/* AI Narrative Summary */}
                          {opp.aiSummary && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed line-clamp-3">
                              {opp.aiSummary}
                            </p>
                          )}

                          {/* Match Reasons Badges */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                              Why Recommended:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {opp.matchReasons.map((reason, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-[11px] font-medium bg-teal-50 text-teal-900 border border-teal-100 rounded-lg"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Solver Ecosystem Counts & Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>Uni Proposals: <strong>{opp.proposalsCount}</strong></span>
                            <span>•</span>
                            <span>Ventures: <strong>{opp.businessConceptsCount}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {opp.hasCollaborated ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Registered
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedProblem(opp);
                                  setShowCollabModal(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 px-3.5 py-2 rounded-xl transition-colors shadow-sm min-h-[44px]"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Offer Support</span>
                              </button>
                            )}

                            <Link
                              to={`/problems/${opp.id}`}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Inspect Problem DNA"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MY COLLABORATIONS */}
            {activeTab === "collaborations" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Enterprise Collaborations</h3>
                    <p className="text-xs text-slate-500">
                      All institutional and community engagements registered by {data?.organization.name}.
                    </p>
                  </div>
                </div>

                {!data?.myCollaborations || data.myCollaborations.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Handshake className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No active collaborations yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Browse recommended opportunities above and offer technical or mentorship support.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.myCollaborations.map((collab) => (
                      <div
                        key={collab.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${getSupportTypeBadge(collab.supportType)}`}>
                              {collab.supportType}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                              collab.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : collab.status === "COMPLETED"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {collab.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              Registered on {new Date(collab.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <Link
                            to={`/problems/${collab.problem.id}`}
                            className="text-base font-bold text-slate-900 hover:text-teal-700 transition-colors block"
                          >
                            {collab.problem.title}
                          </Link>

                          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                            {collab.message}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>District: <strong>{collab.problem.district}</strong></span>
                            <span>•</span>
                            <span>Category: <strong>{collab.problem.category}</strong></span>
                            <span>•</span>
                            <span>Lifecycle: <strong>{collab.problem.status}</strong></span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedCollab(collab);
                              setProgressForm({ status: collab.status, updateText: "" });
                              setShowProgressModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[44px]"
                          >
                            <Activity className="w-3.5 h-3.5 text-teal-700" />
                            <span>Post Progress</span>
                          </button>

                          <Link
                            to={`/problems/${collab.problem.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 p-2 min-h-[44px]"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STARTUP SUPPORT REQUESTS */}
            {activeTab === "requests" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Startup Support Requests</h3>
                    <p className="text-xs text-slate-500">
                      Grassroots ventures seeking technical testing, lab access, mentorship, and pilot validation.
                    </p>
                  </div>
                </div>

                {!data?.pendingRequests || data.pendingRequests.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No pending support requests</p>
                    <p className="text-xs text-slate-500 mt-1">
                      When civic startups request industry facilities or mentorship, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-md">
                              {req.requestType}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              Startup: {req.startup?.name || "Civic Startup"}
                            </span>
                            {req.startup?.district && (
                              <span className="text-xs text-slate-500">({req.startup.district})</span>
                            )}
                            <span className="text-xs text-slate-400">
                              • {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">
                            Problem: {req.problem.title}
                          </h4>

                          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                            {req.details}
                          </p>

                          <div className="text-xs text-slate-500">
                            District: <strong>{req.problem.district}</strong> • Priority:{" "}
                            <strong>Tier {req.problem.priorityTier} ({req.problem.priorityScore}/100)</strong>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setRespondForm({ status: "APPROVED", responseNotes: "" });
                              setShowRespondModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm min-h-[44px]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Review & Respond</span>
                          </button>

                          <Link
                            to={`/problems/${req.problem.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 p-2 min-h-[44px]"
                          >
                            <span>Inspect Context</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: RECENT ACTIVITY */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Corporate Activity Audit Log</h3>
                  <p className="text-xs text-slate-500">
                    Chronological audit log of collaboration milestones, offers, and support evaluations.
                  </p>
                </div>

                {!data?.recentActivity || data.recentActivity.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No activity logged yet</p>
                    <p className="text-xs text-slate-500 mt-1">Actions taken across collaborations will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentActivity.map((act) => (
                      <div
                        key={act.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{act.title}</p>
                            <span className="text-[11px] text-slate-500">
                              Status: <strong>{act.status}</strong> • {new Date(act.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/problems/${act.problemId}`}
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 p-2 min-h-[44px] flex items-center"
                        >
                          View Problem
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ======================================================================= */}
      {/* MODAL 1: OFFER INDUSTRY SUPPORT / COLLABORATION                        */}
      {/* ======================================================================= */}
      {showCollabModal && selectedProblem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Offer Corporate Support</h3>
              </div>
              <button
                onClick={() => {
                  setShowCollabModal(false);
                  setSelectedProblem(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold block text-slate-900">Target Problem:</span>
              <p className="line-clamp-2">{selectedProblem.title}</p>
              <div className="text-[11px] text-slate-500 pt-1">
                District: {selectedProblem.district} • Category: {selectedProblem.category}
              </div>
            </div>

            <form onSubmit={handleCollabSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Support Type *</label>
                <select
                  value={collabForm.supportType}
                  onChange={(e) => setCollabForm({ ...collabForm, supportType: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 min-h-[44px]"
                  required
                >
                  <option value="TECHNICAL">Technical Resources & Lab Validation</option>
                  <option value="MENTORSHIP">Domain Mentorship & Corporate Advisory</option>
                  <option value="PROTOTYPING">Prototyping Labs & Fabrication Access</option>
                  <option value="GENERAL_INTEREST">General CSR & Collaboration Interest</option>
                </select>
                <span className="text-[11px] text-slate-400">
                  Per CivicBridge protocol, support is strictly non-financial (no monetary transactions or escrow).
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Collaboration Proposal / Details *</label>
                <textarea
                  rows={4}
                  value={collabForm.description}
                  onChange={(e) => setCollabForm({ ...collabForm, description: e.target.value })}
                  placeholder="Detail the resources, equipment, pilot sites, or technical expertise your enterprise is committing..."
                  className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 leading-relaxed"
                  required
                  minLength={10}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCollabModal(false);
                    setSelectedProblem(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Submitting..." : "Submit Offer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: RESPOND TO STARTUP SUPPORT REQUEST                            */}
      {/* ======================================================================= */}
      {showRespondModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Review Support Request</h3>
              </div>
              <button
                onClick={() => {
                  setShowRespondModal(false);
                  setSelectedRequest(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">Startup: {selectedRequest.startup?.name}</span>
              <span className="font-medium text-amber-900 block">Request Type: {selectedRequest.requestType}</span>
              <p className="pt-1 whitespace-pre-line text-slate-600">{selectedRequest.details}</p>
            </div>

            <form onSubmit={handleRespondSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Decision *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRespondForm({ ...respondForm, status: "APPROVED" })}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border text-center transition-all min-h-[44px] ${
                      respondForm.status === "APPROVED"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Accept / Approve Support
                  </button>
                  <button
                    type="button"
                    onClick={() => setRespondForm({ ...respondForm, status: "REJECTED" })}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border text-center transition-all min-h-[44px] ${
                      respondForm.status === "REJECTED"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Decline Request
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Response Remarks</label>
                <textarea
                  rows={3}
                  value={respondForm.responseNotes}
                  onChange={(e) => setRespondForm({ ...respondForm, responseNotes: e.target.value })}
                  placeholder="Provide guidance, point of contact, or decline explanation..."
                  className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRespondModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 min-h-[44px]"
                >
                  <span>{submitting ? "Saving..." : "Submit Response"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 3: POST PROGRESS UPDATE ON COLLABORATION                         */}
      {/* ======================================================================= */}
      {showProgressModal && selectedCollab && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Post Milestone / Progress</h3>
              </div>
              <button
                onClick={() => {
                  setShowProgressModal(false);
                  setSelectedCollab(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">Problem: {selectedCollab.problem.title}</span>
              <span className="text-slate-500">Current Status: {selectedCollab.status}</span>
            </div>

            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Update Status *</label>
                <select
                  value={progressForm.status}
                  onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 min-h-[44px]"
                  required
                >
                  <option value="INTERESTED">INTERESTED — Exploring Engagement</option>
                  <option value="ACTIVE">ACTIVE — Field Support / Testing In Progress</option>
                  <option value="COMPLETED">COMPLETED — Engagement Concluded</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Progress Log Notes *</label>
                <textarea
                  rows={4}
                  value={progressForm.updateText}
                  onChange={(e) => setProgressForm({ ...progressForm, updateText: e.target.value })}
                  placeholder="Record testing results, equipment handed over, or mentoring sessions conducted..."
                  className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-600 leading-relaxed"
                  required
                  minLength={5}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowProgressModal(false);
                    setSelectedCollab(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Logging..." : "Log Progress"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryDashboard;
