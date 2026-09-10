import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  LogOut,
  User as UserIcon,
  MapPin,
  AlertCircle,
  FileText,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldCheck,
  XCircle,
  HelpCircle,
  ChevronRight,
  RotateCcw,
  Building2,
  GraduationCap,
  Rocket,
} from "lucide-react";

interface CitizenReportItem {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string | null;
  district: string;
  locationText?: string | null;
  affectedCount: number;
  evidenceUrl?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  filterStatus: "PENDING" | "PASSED" | "REJECTED" | "FLAGGED";
  verificationStatus: "AI_SCREENED" | "GOVERNMENT_VERIFIED" | "DECLINED_BY_GOVT";
  verificationNotes?: string | null;
  priorityScore: number;
  priorityTier: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  aiAnalysis?: {
    id: string;
    predictedCategory: string;
    confidenceScore: number;
    aiSummary: string;
    severityScore: number;
    affectedPeopleScore: number;
    frequencyScore: number;
    evidenceScore: number;
    urgencyScore: number;
    aiUrgencyScore: number;
    aiUrgencyReason?: string | null;
    isDuplicate: boolean;
  } | null;
  validation?: {
    id: string;
    decision: string;
    remarks?: string | null;
    reviewedAt: string;
    severityScore: number;
    affectedScore: number;
    frequencyScore: number;
    evidenceScore: number;
    urgencyScore: number;
    reviewedBy?: {
      id: string;
      name: string;
      role: string;
      district?: string | null;
    } | null;
  } | null;
  proposals?: Array<{
    id: string;
    status: string;
    deliverables?: string | null;
    proposedApproach: string;
    university?: {
      id: string;
      name: string;
      district?: string | null;
    } | null;
    progressUpdates?: Array<{
      id: string;
      updateText: string;
      milestoneTitle?: string | null;
      createdAt: string;
    }>;
  }>;
  businessConcepts?: Array<{
    id: string;
    currentStage: string;
    solutionDescription: string;
    startup?: {
      id: string;
      name: string;
      district?: string | null;
    } | null;
    progressUpdates?: Array<{
      id: string;
      updateText: string;
      milestoneTitle?: string | null;
      createdAt: string;
    }>;
  }>;
  collaborations?: Array<{
    id: string;
    supportType: string;
    status: string;
    industry?: {
      id: string;
      name: string;
      district?: string | null;
    } | null;
  }>;
  _count?: {
    proposals: number;
    businessConcepts: number;
    collaborations: number;
  };
}

export const CitizenDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyReports = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/problems/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }
        throw new Error(`Failed to load your reports (HTTP ${res.status}).`);
      }

      const data = await res.json();
      if (data.success) {
        setReports(data.problems || []);
      } else {
        throw new Error(data.error || "Unable to parse reports data.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching reports.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // Helper: Status badge color and label
  const getVerificationBadge = (report: CitizenReportItem) => {
    const isMoreInfo = report.verificationNotes?.startsWith("[MORE_INFO_REQUESTED]");

    if (isMoreInfo) {
      return {
        label: "More Information Requested",
        desc: "Administration requested additional details or photo evidence.",
        classes: "bg-amber-50 text-amber-800 border-amber-200",
        icon: HelpCircle,
      };
    }

    switch (report.verificationStatus) {
      case "GOVERNMENT_VERIFIED":
        return {
          label: "Government Verified",
          desc: "Endorsed by District Administration as confirmed civic issue.",
          classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: ShieldCheck,
        };
      case "DECLINED_BY_GOVT":
        return {
          label: "Government Declined",
          desc: "Declined for government endorsement. Still active in open Problem Bank for innovators.",
          classes: "bg-slate-100 text-slate-700 border-slate-200",
          icon: XCircle,
        };
      case "AI_SCREENED":
      default:
        return {
          label: "AI Screened",
          desc: "AI has screened and prioritized this problem. Open to statewide solvers.",
          classes: "bg-blue-50 text-blue-800 border-blue-200",
          icon: Sparkles,
        };
    }
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                Citizen Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Problem Bank</span>
            </Link>
            <Link
              to="/citizen/report"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Report a Problem</span>
              <span className="sm:hidden">Report</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* User Profile Banner */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                District: {user?.district || "Ranchi"}
              </span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-md">
                Role: CITIZEN
              </span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-md">
                {reports.length} {reports.length === 1 ? "Report" : "Reports"} Filed
              </span>
            </div>
          </div>
        </div>

        {/* Action Callout */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              AI Zero-Gate Platform
            </div>
            <h3 className="text-lg font-bold">See a problem in your locality?</h3>
            <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
              Every citizen report is instantly screened by AI and visible in the Problem Bank for universities and startups to build real solutions.
            </p>
          </div>
          <Link
            to="/citizen/report"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report a New Issue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* My Reports Section Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>My Reported Problems</span>
            </h2>
            <p className="text-xs text-slate-500">
              Track the end-to-end lifecycle, AI screening results, and solver activity on your civic reports.
            </p>
          </div>
          <button
            onClick={fetchMyReports}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-600">Loading your reported problems...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Could not load reports</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && reports.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No Reports Filed Yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You haven't reported any community civic problems. When you report an issue, it will appear here with live tracking, AI analysis, and resolution progress.
              </p>
            </div>
            <Link
              to="/citizen/report"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Your First Civic Problem</span>
            </Link>
          </div>
        )}

        {/* Reports List */}
        {!isLoading && !error && reports.length > 0 && (
          <div className="space-y-5">
            {reports.map((report) => {
              const badge = getVerificationBadge(report);
              const BadgeIcon = badge.icon;
              const hasInstitutionalAction =
                (report._count?.proposals || 0) > 0 ||
                (report._count?.businessConcepts || 0) > 0 ||
                (report._count?.collaborations || 0) > 0;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all p-5 shadow-xs space-y-4"
                >
                  {/* Card Header: Category, District, Priority & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {report.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {report.district}
                        {report.locationText ? ` • ${report.locationText}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-white`}>
                        Score: {report.priorityScore}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getPriorityColor(report.priorityTier)}`}>
                        Tier {report.priorityTier}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {report.title}
                      </h3>
                      <Link
                        to={`/problems/${report.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 shrink-0 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors min-h-[44px]"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {report.description}
                    </p>
                  </div>

                  {/* AI Advisory Summary Box (Simple & Understandable, No Prompts) */}
                  {report.aiAnalysis && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>AI Assessment Summary (Advisory)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Confidence: {Math.round(report.aiAnalysis.confidenceScore * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {report.aiAnalysis.aiSummary}
                      </p>

                      {/* AI Factor Breakdown Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 text-[11px]">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Severity</span>
                          <strong className="text-slate-800">{report.aiAnalysis.severityScore}/100</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Affected</span>
                          <strong className="text-slate-800">{report.aiAnalysis.affectedPeopleScore}/100</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Frequency</span>
                          <strong className="text-slate-800">{report.aiAnalysis.frequencyScore}/100</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Evidence</span>
                          <strong className="text-slate-800">{report.aiAnalysis.evidenceScore}/100</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                          <span className="text-slate-400 block text-[10px]">Urgency</span>
                          <strong className="text-slate-800">{report.aiAnalysis.urgencyScore}/100</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Government Verification Trust Signal Card */}
                  <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${badge.classes}`}>
                    <BadgeIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{badge.label}</span>
                        {report.validation && (
                          <span className="text-[10px] opacity-75">
                            • Audited on {new Date(report.validation.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="opacity-90">{badge.desc}</p>
                      {report.validation?.remarks && (
                        <p className="mt-1 pt-1 border-t border-current/20 italic opacity-95">
                          "{report.validation.remarks}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Problem Progress Timeline (Mobile-First Step Flow) */}
                  <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Problem Progress Timeline
                    </span>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-1">
                      {/* Step 1: Submitted */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">Submitted</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block flex-1 h-0.5 bg-slate-200 mx-2"></div>

                      {/* Step 2: AI Screening */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            report.filterStatus === "PASSED"
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {report.filterStatus === "PASSED" ? "✓" : "⏳"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            AI Screening
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {report.filterStatus === "PASSED" ? "Passed & Banked" : "Triage Pending"}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block flex-1 h-0.5 bg-slate-200 mx-2"></div>

                      {/* Step 3: Government Review */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            report.verificationStatus === "GOVERNMENT_VERIFIED"
                              ? "bg-emerald-600 text-white"
                              : report.verificationStatus === "DECLINED_BY_GOVT"
                              ? "bg-slate-400 text-white"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {report.verificationStatus === "GOVERNMENT_VERIFIED"
                            ? "✓"
                            : report.verificationStatus === "DECLINED_BY_GOVT"
                            ? "✕"
                            : "•"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            Govt Trust Signal
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {report.verificationStatus === "GOVERNMENT_VERIFIED"
                              ? "Verified"
                              : report.verificationStatus === "DECLINED_BY_GOVT"
                              ? "Declined"
                              : "Open Review"}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block flex-1 h-0.5 bg-slate-200 mx-2"></div>

                      {/* Step 4: Solvers Action */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            hasInstitutionalAction
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {hasInstitutionalAction ? "✓" : "4"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            Solver Action
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {hasInstitutionalAction ? "Proposals Active" : "Awaiting Solvers"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Institutional Actions Summary (Proposals, Concepts, Collabs) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-4 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span>University Proposals: <strong>{report._count?.proposals || 0}</strong></span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Rocket className="w-4 h-4 text-emerald-600" />
                        <span>Startup Concepts: <strong>{report._count?.businessConcepts || 0}</strong></span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <span>Industry Collabs: <strong>{report._count?.collaborations || 0}</strong></span>
                      </span>
                    </div>

                    <Link
                      to={`/problems/${report.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-emerald-700 min-h-[44px]"
                    >
                      <span>Track Full Progress</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default CitizenDashboard;
