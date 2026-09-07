import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth, getDashboardPath } from "../context/AuthContext";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Users,
  Calendar,
  Layers,
  Copy,
  ExternalLink,
  Activity,
  FileText,
  User as UserIcon,
  ChevronRight,
  XCircle,
  GraduationCap,
  Rocket,
  Building2,
  Send,
  PlusCircle,
  Clock,
  TrendingUp,
  X,
  Sparkles,
} from "lucide-react";

interface ProgressUpdateItem {
  id: string;
  updateText: string;
  milestoneTitle?: string | null;
  status: string;
  createdAt: string;
  postedBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface ProposalItem {
  id: string;
  title?: string;
  problemId: string;
  universityId: string;
  facultyMentor: string;
  proposedApproach: string;
  deliverables?: string | null;
  budgetRequired?: number | null;
  status: string;
  createdAt: string;
  university?: {
    id: string;
    name: string;
    type: string;
    district: string;
  };
  progressUpdates?: ProgressUpdateItem[];
}

interface BusinessConceptItem {
  id: string;
  title?: string;
  problemId: string;
  startupId: string;
  solutionDescription: string;
  targetBeneficiaries?: string | null;
  marketSize?: string | null;
  businessModel?: string | null;
  revenueModel?: string | null;
  sustainabilityModel?: string | null;
  currentStage?: string;
  status: string;
  createdAt: string;
  startup?: {
    id: string;
    name: string;
    type: string;
    district: string;
  };
  progressUpdates?: ProgressUpdateItem[];
}

interface CollaborationItem {
  id: string;
  problemId: string;
  industryId: string;
  supportType: string;
  message: string;
  status: string;
  createdAt: string;
  industry?: {
    id: string;
    name: string;
    type: string;
    district: string;
  };
}

interface ProblemDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string | null;
  district: string;
  locationText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  affectedCount: number;
  evidenceUrl?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  filterStatus: "PENDING" | "PASSED" | "REJECTED" | "FLAGGED";
  filterReason?: string | null;
  priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  verificationNotes?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: {
    id: string;
    aiSummary: string;
    predictedCategory: string;
    confidenceScore: number;
    severityScore: number;
    affectedPeopleScore: number;
    frequencyScore: number;
    evidenceScore: number;
    urgencyScore: number;
    aiUrgencyScore: number;
    aiUrgencyReason: string;
    isDuplicate: boolean;
    duplicateSimilarity?: number | null;
    similarProblemIds: string[];
    createdAt: string;
  } | null;
  submittedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
    district: string;
  } | null;
  proposals?: ProposalItem[];
  businessConcepts?: BusinessConceptItem[];
  collaborations?: CollaborationItem[];
  _count?: {
    proposals: number;
    businessConcepts: number;
    collaborations: number;
  };
}

export const ProblemDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Institutional active tab: 'proposals' | 'concepts' | 'collaborations'
  const [activeTab, setActiveTab] = useState<"proposals" | "concepts" | "collaborations">("proposals");

  // Modals & Action Forms
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);

  // Progress Update Modal
  const [progressTarget, setProgressTarget] = useState<{
    type: "proposal" | "concept" | "collab";
    id: string;
    title: string;
    currentStatus: string;
  } | null>(null);

  // Form states
  const [proposalForm, setProposalForm] = useState({
    title: "",
    description: "",
    facultyMentor: "",
    deliverables: "",
  });

  const [conceptForm, setConceptForm] = useState({
    title: "",
    description: "",
    targetBeneficiaries: "",
    businessModel: "",
  });

  const [collabForm, setCollabForm] = useState({
    supportType: "TECHNICAL",
    description: "",
  });

  const [progressForm, setProgressForm] = useState({
    updateText: "",
    status: "",
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProblem = async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/problems/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        throw new Error(`Problem #${id} was not found.`);
      }

      if (!res.ok) {
        throw new Error(`Failed to load problem details (Status ${res.status}).`);
      }

      const data = await res.json();
      if (data.success && data.problem) {
        setProblem(data.problem);
      } else {
        throw new Error(data.error || "Failed to parse problem record.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred loading details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProblem();
  }, [id, token]);

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

  // Submit University Proposal
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`http://localhost:5000/api/problems/${id}/proposals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(proposalForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit research proposal.");
      }

      setActionMessage({ type: "success", text: "Research proposal submitted successfully!" });
      setShowProposalModal(false);
      setProposalForm({ title: "", description: "", facultyMentor: "", deliverables: "" });
      await fetchProblem();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to submit proposal." });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Startup Business Concept
  const handleConceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`http://localhost:5000/api/problems/${id}/business-concepts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(conceptForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit business concept.");
      }

      setActionMessage({ type: "success", text: "Business concept submitted successfully!" });
      setShowConceptModal(false);
      setConceptForm({ title: "", description: "", targetBeneficiaries: "", businessModel: "" });
      await fetchProblem();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to submit concept." });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Industry Collaboration
  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`http://localhost:5000/api/problems/${id}/collaborations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(collabForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to offer industry collaboration.");
      }

      setActionMessage({ type: "success", text: "Industry collaboration offered successfully!" });
      setShowCollabModal(false);
      setCollabForm({ supportType: "TECHNICAL", description: "" });
      await fetchProblem();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to submit collaboration." });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Progress Update
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !progressTarget) return;
    setActionLoading(true);
    setActionMessage(null);

    let endpoint = "";
    if (progressTarget.type === "proposal") {
      endpoint = `http://localhost:5000/api/proposals/${progressTarget.id}/progress`;
    } else if (progressTarget.type === "concept") {
      endpoint = `http://localhost:5000/api/business-concepts/${progressTarget.id}/progress`;
    } else if (progressTarget.type === "collab") {
      endpoint = `http://localhost:5000/api/collaborations/${progressTarget.id}/progress`;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          updateText: progressForm.updateText,
          status: progressForm.status || progressTarget.currentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post progress update.");
      }

      setActionMessage({ type: "success", text: "Progress update recorded successfully!" });
      setProgressTarget(null);
      setProgressForm({ updateText: "", status: "" });
      await fetchProblem();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to update progress." });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Problem Bank</span>
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-slate-200"></span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-sm">
              <span>Problem</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="truncate font-medium text-slate-800">{problem?.title || id}</span>
            </div>
          </div>

          <Link
            to={user ? getDashboardPath(user.role) : "/"}
            className="text-xs font-medium text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Toast / Action Message */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Fetching verified problem record...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Problem Not Found</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <button
              onClick={() => navigate("/problems")}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              Return to Problem Bank
            </button>
          </div>
        )}

        {/* Problem Details View */}
        {problem && !isLoading && (
          <div className="space-y-6">
            {/* Top Verification Status Banner */}
            {problem.verificationStatus === "GOVERNMENT_VERIFIED" ? (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded-full uppercase tracking-wide">
                        Government Verified Trust Signal
                      </span>
                      {problem.verifiedAt && (
                        <span className="text-[11px] text-amber-800">
                          Verified on {new Date(problem.verifiedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                      This problem has been independently reviewed and validated on the ground by Jharkhand district administration authorities.
                    </p>
                    {problem.verificationNotes && (
                      <p className="text-xs bg-white/70 p-2.5 rounded-lg border border-amber-200 text-amber-950 mt-2 font-mono">
                        Verification Note: {problem.verificationNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : problem.verificationStatus === "DECLINED_BY_GOVT" ? (
              <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-200 text-slate-800 rounded-full uppercase tracking-wide">
                        Government Review: Declined
                      </span>
                      {problem.verifiedAt && (
                        <span className="text-[11px] text-slate-500">
                          Reviewed on {new Date(problem.verifiedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      District administration reviewed this civic submission and declined official government verification. Per CivicBridge architecture, this problem <strong>remains active and visible in the Problem Bank</strong> and open for university and startup solutions.
                    </p>
                    {problem.verificationNotes && (
                      <p className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 mt-2 font-mono">
                        Decline Note: {problem.verificationNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-200 text-emerald-900 rounded-full uppercase tracking-wide">
                      AI Screened (Actionable)
                    </span>
                    <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                      This civic problem has passed automated relevance and spam screening with high confidence ({Math.round((problem.aiAnalysis?.confidenceScore || 0.9) * 100)}%). It is live in the Problem Bank and immediately eligible for university proposals and startup solutions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advisory Duplicate Notice (Non-blocking) */}
            {problem.aiAnalysis?.isDuplicate && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
                <Copy className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Advisory Duplicate Match</span>
                  <p className="text-blue-800 leading-relaxed">
                    AI screening identified potential similarity ({Math.round((problem.aiAnalysis.duplicateSimilarity || 0) * 100)}% cosine match) with an existing problem. Per CivicBridge architecture, duplicate detection is purely advisory: this problem is retained, fully active, and accessible.
                  </p>
                  {problem.aiAnalysis.similarProblemIds && problem.aiAnalysis.similarProblemIds.length > 0 && (
                    <div className="text-[11px] text-blue-600 font-mono pt-1">
                      Matched IDs: {problem.aiAnalysis.similarProblemIds.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Title & Metadata Header */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                    <Layers className="w-3.5 h-3.5" />
                    {problem.category}
                  </span>
                  {problem.subCategory && (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                      {problem.subCategory}
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    Lifecycle: <strong className="text-slate-900">{problem.status}</strong>
                  </span>
                </div>

                {/* Priority Score Pill */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Priority Score</span>
                    <span className="text-sm font-extrabold text-slate-900">{problem.priorityScore}/100</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border ${getPriorityColor(
                      problem.priorityTier
                    )}`}
                  >
                    Tier {problem.priorityTier}
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                {problem.title}
              </h1>

              {/* Geo & Submitter Specs */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    District: <strong className="text-slate-900">{problem.district}</strong>
                    {problem.locationText && ` (${problem.locationText})`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Affected Scale: <strong className="text-slate-900">{problem.affectedCount} citizens</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Submitted: <strong className="text-slate-900">{new Date(problem.createdAt).toLocaleDateString()}</strong>
                  </span>
                </div>
                {problem.submittedBy && (
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Reported by: <strong className="text-slate-900">{problem.submittedBy.name}</strong> ({problem.submittedBy.district})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid Layout: Description & AI Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Full Description & Evidence */}
              <div className="lg:col-span-2 space-y-6">
                {/* Full Description */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Detailed Problem Description
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {problem.description}
                  </p>
                </div>

                {/* Evidence & Location Card */}
                {(problem.evidenceUrl || problem.locationText) && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Geographic & Supporting Evidence
                    </h3>
                    <div className="space-y-2 text-xs">
                      {problem.locationText && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 block">Specific Landmark / Location:</span>
                            <span className="text-slate-600">{problem.locationText}</span>
                          </div>
                        </div>
                      )}

                      {problem.evidenceUrl && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-slate-700 truncate">
                            <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-medium truncate">{problem.evidenceUrl}</span>
                          </div>
                          <a
                            href={problem.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 rounded-lg font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
                          >
                            <span>Open Evidence</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 1 Col: AI Analysis & 5 Factor Breakdown */}
              <div className="space-y-6">
                {/* 2-Sentence AI Summary */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      AI Triage Summary
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                      Confidence: {Math.round((problem.aiAnalysis?.confidenceScore || 0.9) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {problem.aiAnalysis?.aiSummary || "Autonomous AI summary generated based on civic report narrative."}
                  </p>
                </div>

                {/* 5-Factor Normalized Priority Breakdown */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Priority Factor Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Weighted formula: Severity (25%) + Affected (25%) + Frequency (15%) + Evidence (15%) + Urgency (20%)
                    </p>
                  </div>

                  {/* Main Score Display */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {problem.priorityScore}
                    </span>
                    <span className="text-xs text-slate-400 block font-medium">/ 100 Unified Score</span>
                    <div className="mt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getScoreBadgeColor(problem.priorityScore)}`}>
                        Tier: {problem.priorityTier}
                      </span>
                    </div>
                  </div>

                  {/* Factors List */}
                  {problem.aiAnalysis && (
                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Severity (25%)</span>
                        <span className="font-bold text-slate-900">{problem.aiAnalysis.severityScore}/100</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Affected People (25%)</span>
                        <span className="font-bold text-slate-900">{problem.aiAnalysis.affectedPeopleScore}/100</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Frequency (15%)</span>
                        <span className="font-bold text-slate-900">{problem.aiAnalysis.frequencyScore}/100</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-medium">Evidence Quality (15%)</span>
                        <span className="font-bold text-slate-900">{problem.aiAnalysis.evidenceScore}/100</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-600 font-medium">Urgency (20%)</span>
                        <span className="font-bold text-slate-900">{problem.aiAnalysis.urgencyScore}/100</span>
                      </div>
                    </div>
                  )}

                  {/* Raw Urgency Auditing */}
                  {problem.aiAnalysis?.aiUrgencyScore && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800">Raw AI Urgency Signal: </span>
                      {problem.aiAnalysis.aiUrgencyScore}/10
                      {problem.aiAnalysis.aiUrgencyReason && ` — "${problem.aiAnalysis.aiUrgencyReason}"`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* PHASE 6: INSTITUTIONAL ACTION HUB                                  */}
            {/* ================================================================= */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Header with Visual Resolution Pathway */}
              <div className="border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-bold text-slate-900">
                        Institutional Action Hub
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Collaborative multi-stakeholder pathway connecting academic research, grassroots startups, and industrial CSR.
                    </p>
                  </div>

                  {/* Visual Pathway Flow Indicator */}
                  <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600">
                    <span className="text-emerald-700 font-bold">Civic Intake</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-indigo-700 font-bold">Institutional Action</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-amber-700 font-bold">Progress Updates</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-purple-700 font-bold">Resolution</span>
                  </div>
                </div>

                {/* Clear Government Verification Non-blocking Rule Banner */}
                <div className="mt-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Open Institutional Action Policy:</span>
                    <span>
                      Government verification is <strong>not required</strong> before institutions take action. Any problem that passes automated AI screening in the Problem Bank is immediately actionable by universities, startups, and industry partners.
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation & Role Submission CTAs */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 border-b border-slate-200 sm:border-0 pb-2 sm:pb-0">
                  <button
                    onClick={() => setActiveTab("proposals")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
                      activeTab === "proposals"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>University Proposals</span>
                    <span
                      className={`ml-1 px-2 py-0.5 text-[10px] rounded-full ${
                        activeTab === "proposals"
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {problem.proposals?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("concepts")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
                      activeTab === "concepts"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Startup Solutions</span>
                    <span
                      className={`ml-1 px-2 py-0.5 text-[10px] rounded-full ${
                        activeTab === "concepts"
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {problem.businessConcepts?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("collaborations")}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
                      activeTab === "collaborations"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Industry Support</span>
                    <span
                      className={`ml-1 px-2 py-0.5 text-[10px] rounded-full ${
                        activeTab === "collaborations"
                          ? "bg-indigo-700 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {problem.collaborations?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Role-Specific Action Buttons */}
                <div>
                  {user?.role === "UNIVERSITY" && (
                    <button
                      onClick={() => {
                        setShowProposalModal(true);
                        setActiveTab("proposals");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Submit Proposal</span>
                    </button>
                  )}

                  {user?.role === "STARTUP" && (
                    <button
                      onClick={() => {
                        setShowConceptModal(true);
                        setActiveTab("concepts");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Submit Business Concept</span>
                    </button>
                  )}

                  {user?.role === "INDUSTRY" && (
                    <button
                      onClick={() => {
                        setShowCollabModal(true);
                        setActiveTab("collaborations");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Offer Industry Support</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ============================================================= */}
              {/* TAB 1: UNIVERSITY PROPOSALS                                    */}
              {/* ============================================================= */}
              {activeTab === "proposals" && (
                <div className="space-y-4">
                  {(!problem.proposals || problem.proposals.length === 0) && (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">No university proposals submitted yet.</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Universities can deploy academic research teams, student capstones, and faculty expertise to solve this problem.
                      </p>
                    </div>
                  )}

                  {problem.proposals?.map((proposal) => {
                    const isOwner = user?.role === "UNIVERSITY" && user.organizationId === proposal.universityId;

                    return (
                      <div
                        key={proposal.id}
                        className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 rounded-full uppercase">
                                {proposal.status}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(proposal.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {proposal.title || proposal.deliverables || "Academic Research Initiative"}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium">
                              Institution: <strong className="text-slate-900">{proposal.university?.name || "University Partner"}</strong>
                              {proposal.university?.district && ` (${proposal.university.district})`}
                              {proposal.facultyMentor && ` • Mentor: ${proposal.facultyMentor}`}
                            </p>
                          </div>

                          {/* Allow own university to log progress */}
                          {isOwner && (
                            <button
                              onClick={() => {
                                setProgressTarget({
                                  type: "proposal",
                                  id: proposal.id,
                                  title: proposal.title || "University Proposal",
                                  currentStatus: proposal.status,
                                });
                                setProgressForm({ updateText: "", status: proposal.status });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Log Progress</span>
                            </button>
                          )}
                        </div>

                        {/* Proposal Approach Details */}
                        <div className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                          <span className="font-semibold text-slate-900 block mb-1">Proposed Approach & Methodology:</span>
                          {proposal.proposedApproach}
                        </div>

                        {/* Progress Timeline */}
                        {proposal.progressUpdates && proposal.progressUpdates.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Progress Timeline ({proposal.progressUpdates.length})
                            </span>
                            <div className="space-y-2">
                              {proposal.progressUpdates.map((up) => (
                                <div
                                  key={up.id}
                                  className="text-xs bg-white p-3 rounded-lg border border-slate-200 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-indigo-700">Status: {up.status}</span>
                                    <span className="text-slate-400">
                                      {new Date(up.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-slate-700">{up.updateText}</p>
                                  {up.postedBy && (
                                    <div className="text-[10px] text-slate-400 pt-1">
                                      Posted by: {up.postedBy.name} ({up.postedBy.role})
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 2: STARTUP BUSINESS CONCEPTS                               */}
              {/* ============================================================= */}
              {activeTab === "concepts" && (
                <div className="space-y-4">
                  {(!problem.businessConcepts || problem.businessConcepts.length === 0) && (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <Rocket className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">No startup business concepts submitted yet.</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Startups can prototype entrepreneurial business models to address this civic bottleneck sustainably.
                      </p>
                    </div>
                  )}

                  {problem.businessConcepts?.map((concept) => {
                    const isOwner = user?.role === "STARTUP" && user.organizationId === concept.startupId;

                    return (
                      <div
                        key={concept.id}
                        className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full uppercase">
                                {concept.status}
                              </span>
                              {concept.currentStage && (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700 rounded-full">
                                  Stage: {concept.currentStage}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500">
                                {new Date(concept.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {concept.title || "Civic Tech Solution Concept"}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium">
                              Venture: <strong className="text-slate-900">{concept.startup?.name || "Startup Partner"}</strong>
                              {concept.startup?.district && ` (${concept.startup.district})`}
                            </p>
                          </div>

                          {/* Allow own startup to log progress */}
                          {isOwner && (
                            <button
                              onClick={() => {
                                setProgressTarget({
                                  type: "concept",
                                  id: concept.id,
                                  title: concept.title || "Business Concept",
                                  currentStatus: concept.status,
                                });
                                setProgressForm({ updateText: "", status: concept.status });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Log Progress</span>
                            </button>
                          )}
                        </div>

                        {/* Concept Details */}
                        <div className="space-y-2">
                          <div className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                            <span className="font-semibold text-slate-900 block mb-1">Solution Description:</span>
                            {concept.solutionDescription}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {concept.targetBeneficiaries && (
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="font-semibold text-slate-900 block mb-0.5">Target Beneficiaries:</span>
                                <span className="text-slate-600">{concept.targetBeneficiaries}</span>
                              </div>
                            )}
                            {concept.businessModel && (
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="font-semibold text-slate-900 block mb-0.5">Business & Delivery Model:</span>
                                <span className="text-slate-600">{concept.businessModel}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Timeline */}
                        {concept.progressUpdates && concept.progressUpdates.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Progress Timeline ({concept.progressUpdates.length})
                            </span>
                            <div className="space-y-2">
                              {concept.progressUpdates.map((up) => (
                                <div
                                  key={up.id}
                                  className="text-xs bg-white p-3 rounded-lg border border-slate-200 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-purple-700">Status: {up.status}</span>
                                    <span className="text-slate-400">
                                      {new Date(up.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-slate-700">{up.updateText}</p>
                                  {up.postedBy && (
                                    <div className="text-[10px] text-slate-400 pt-1">
                                      Posted by: {up.postedBy.name} ({up.postedBy.role})
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 3: INDUSTRY COLLABORATIONS                                 */}
              {/* ============================================================= */}
              {activeTab === "collaborations" && (
                <div className="space-y-4">
                  {(!problem.collaborations || problem.collaborations.length === 0) && (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">No industry collaborations offered yet.</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Industry leaders can offer mentorship, technical infrastructure, prototyping facilities, or general partnership.
                      </p>
                    </div>
                  )}

                  {problem.collaborations?.map((collab) => {
                    const isOwner = user?.role === "INDUSTRY" && user.organizationId === collab.industryId;

                    return (
                      <div
                        key={collab.id}
                        className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-full uppercase">
                                {collab.status}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                                Support: {collab.supportType}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(collab.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-1">
                              Corporate Partner: <strong className="text-slate-900">{collab.industry?.name || "Industry Partner"}</strong>
                              {collab.industry?.district && ` (${collab.industry.district})`}
                            </p>
                          </div>

                          {/* Allow own industry to update collaboration */}
                          {isOwner && (
                            <button
                              onClick={() => {
                                setProgressTarget({
                                  type: "collab",
                                  id: collab.id,
                                  title: `Collaboration: ${collab.supportType}`,
                                  currentStatus: collab.status,
                                });
                                setProgressForm({ updateText: "", status: collab.status });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Update Status</span>
                            </button>
                          )}
                        </div>

                        {/* Collaboration Message */}
                        <div className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                          <span className="font-semibold text-slate-900 block mb-1">Collaboration Scope & Terms:</span>
                          {collab.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* MODAL: SUBMIT UNIVERSITY PROPOSAL                                     */}
      {/* ===================================================================== */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Submit University Research Proposal</h3>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Proposal Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Biochar Water Filtration System for Arsenic Remediation"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Faculty Mentor / Research Lead
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ananya Mukherjee, Department of Environmental Engineering"
                  value={proposalForm.facultyMentor}
                  onChange={(e) => setProposalForm({ ...proposalForm, facultyMentor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Proposed Approach & Methodology <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the technical design, lab validation, student deployment, and timeline..."
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Key Deliverables
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1000L/day prototype unit, testing report, maintenance handbook"
                  value={proposalForm.deliverables}
                  onChange={(e) => setProposalForm({ ...proposalForm, deliverables: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Submitting..." : "Submit Proposal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SUBMIT STARTUP BUSINESS CONCEPT                                */}
      {/* ===================================================================== */}
      {showConceptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Submit Startup Business Concept</h3>
              </div>
              <button
                onClick={() => setShowConceptModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConceptSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Concept Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Village IoT Water ATMs & Decentralized Purification Franchise"
                  value={conceptForm.title}
                  onChange={(e) => setConceptForm({ ...conceptForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Solution Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your market-ready solution, operational model, and community rollout strategy..."
                  value={conceptForm.description}
                  onChange={(e) => setConceptForm({ ...conceptForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Target Beneficiaries
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5,000 tribal households across 3 panchayats"
                  value={conceptForm.targetBeneficiaries}
                  onChange={(e) => setConceptForm({ ...conceptForm, targetBeneficiaries: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Business & Sustainability Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. Micro-utility subscription model supported by village panchayat cooperative"
                  value={conceptForm.businessModel}
                  onChange={(e) => setConceptForm({ ...conceptForm, businessModel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConceptModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Submitting..." : "Submit Concept"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: OFFER INDUSTRY COLLABORATION                                   */}
      {/* ===================================================================== */}
      {showCollabModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Offer Industry Support & Collaboration</h3>
              </div>
              <button
                onClick={() => setShowCollabModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollabSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Support Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={collabForm.supportType}
                  onChange={(e) => setCollabForm({ ...collabForm, supportType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="TECHNICAL">TECHNICAL — Engineering expertise & technical advisory</option>
                  <option value="MENTORSHIP">MENTORSHIP — Executive mentorship & domain guidance</option>
                  <option value="PROTOTYPING">PROTOTYPING — Industrial lab & fabrication access</option>
                  <option value="GENERAL_INTEREST">GENERAL_INTEREST — Strategic ecosystem partnership</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Note: Per CivicBridge specifications, direct monetary funding is not accepted here.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Collaboration Scope & Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail what equipment, expert hours, fabrication facilities, or testing resources your company offers..."
                  value={collabForm.description}
                  onChange={(e) => setCollabForm({ ...collabForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCollabModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Submitting..." : "Offer Collaboration"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: LOG PROGRESS UPDATE                                            */}
      {/* ===================================================================== */}
      {progressTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Log Progress Update</h3>
                <p className="text-[11px] text-slate-500 truncate max-w-xs">{progressTarget.title}</p>
              </div>
              <button
                onClick={() => setProgressTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  New Status
                </label>
                {progressTarget.type === "proposal" ? (
                  <select
                    value={progressForm.status || progressTarget.currentStatus}
                    onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                ) : progressTarget.type === "concept" ? (
                  <select
                    value={progressForm.status || progressTarget.currentStatus}
                    onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                ) : (
                  <select
                    value={progressForm.status || progressTarget.currentStatus}
                    onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Progress Description / Milestone Update <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the milestone accomplished, lab tests verified, or next phase deliverables..."
                  value={progressForm.updateText}
                  onChange={(e) => setProgressForm({ ...progressForm, updateText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressTarget(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Updating..." : "Post Update"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemDetailsPage;
