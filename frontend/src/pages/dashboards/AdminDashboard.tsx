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
  submittedBy?: {
    id: string;
    name: string;
    role: string;
    district: string;
  } | null;
}

export const AdminDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();

  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Action State
  const [actionModal, setActionModal] = useState<{
    type: "VERIFY" | "DECLINE";
    problem: VerificationItem;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/verification-queue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load verification queue (Status: ${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setQueue(data.queue || []);
      } else {
        throw new Error(data.error || "Failed to parse verification queue.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred loading verification queue.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleOpenAction = (type: "VERIFY" | "DECLINE", problem: VerificationItem) => {
    setActionModal({ type, problem });
    setActionNotes(
      type === "VERIFY"
        ? "Endorsed and verified on-site by District Administration."
        : "Declined for official government endorsement upon administrative review."
    );
  };

  const handleConfirmAction = async () => {
    if (!actionModal || !token) return;
    setIsSubmittingAction(true);

    const { type, problem } = actionModal;
    const endpoint =
      type === "VERIFY"
        ? `${API_BASE_URL}/admin/problems/${problem.id}/verify`
        : `${API_BASE_URL}/admin/problems/${problem.id}/decline`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: actionNotes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${type.toLowerCase()} problem.`);
      }

      // Optimistically remove from queue immediately
      setQueue((prev) => prev.filter((item) => item.id !== problem.id));
      setActionModal(null);

      if (type === "VERIFY") {
        setToastMessage({
          type: "success",
          text: `Problem "${problem.title.slice(0, 40)}..." officially verified by Government! Visible as GOVERNMENT_VERIFIED in Problem Bank.`,
        });
      } else {
        setToastMessage({
          type: "info",
          text: `Problem "${problem.title.slice(0, 40)}..." marked as DECLINED_BY_GOVT. It remains visible and active in the Problem Bank for institutional innovation.`,
        });
      }

      // Clear toast after 5s
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: err.message || "Operation failed.",
      });
    } finally {
      setIsSubmittingAction(false);
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

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return "bg-rose-600 text-white";
    if (score >= 40) return "bg-amber-500 text-white";
    return "bg-slate-600 text-white";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              CB
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">CivicBridge</h1>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-900 rounded-full">
                Government / Admin Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/problems"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-2 rounded-lg transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Browse Problem Bank</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* User Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-md">
                Role: ADMIN (Government)
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                State: Jharkhand
              </span>
            </div>
          </div>
        </div>

        {/* Policy Guidance Alert */}
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-amber-950 text-sm">
              Government Verification Architecture Guarantee
            </h3>
            <p className="text-amber-900 leading-relaxed">
              <strong>Government verification strengthens trust but does not control whether institutions can discover or act on a valid problem.</strong>{" "}
              In accordance with CivicBridge principles, high-priority issues are screened by AI and immediately open to universities and startups. Your verification endorsement provides ground validation, while declining verification keeps the problem active for open innovation.
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : toastMessage.type === "info"
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toastMessage.type === "info" && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            {toastMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

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
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
            >
              Refresh Queue
            </button>
          </div>

          {/* Queue Body */}
          <div className="p-5 pt-0">
            {isLoading && (
              <div className="py-12 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-500">Loading pending verification queue...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLoading && queue.length === 0 && (
              <div className="py-12 text-center max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Verification Queue is Empty</h3>
                <p className="text-xs text-slate-500">
                  No high-priority civic problems currently require government review. Check back when citizens report new critical issues.
                </p>
                <Link
                  to="/problems"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 pt-1"
                >
                  <span>Explore Statewide Problem Bank</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Problem Cards in Queue */}
            {!isLoading && queue.length > 0 && (
              <div className="space-y-4">
                {queue.map((problem) => (
                  <div
                    key={problem.id}
                    className="p-5 rounded-xl border border-slate-200 hover:border-amber-300 transition-all bg-white shadow-xs space-y-3"
                  >
                    {/* Top Row: Category, Tier, Score, District */}
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

                      {/* Score & Tier Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreBadgeColor(problem.priorityScore)}`}>
                          Score: {problem.priorityScore}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getPriorityColor(problem.priorityTier)}`}>
                          Tier {problem.priorityTier}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {problem.title}
                      </h3>
                      <Link
                        to={`/problems/${problem.id}`}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* AI 2-Sentence Summary */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>AI Triage Summary</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {problem.aiAnalysis?.aiSummary || problem.description}
                      </p>
                    </div>

                    {/* Specs Row */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Affected: <strong className="text-slate-800">{problem.affectedCount} citizens</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Status: <strong className="text-emerald-700 font-semibold">AI Screened</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Submitted: {new Date(problem.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenAction("DECLINE", problem)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-rose-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Decline Verification</span>
                      </button>

                      <button
                        onClick={() => handleOpenAction("VERIFY", problem)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify & Endorse Problem</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Verification / Decline Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  actionModal.type === "VERIFY"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {actionModal.type === "VERIFY" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {actionModal.type === "VERIFY"
                    ? "Confirm Government Verification"
                    : "Decline Government Verification"}
                </h3>
                <p className="text-xs text-slate-500">
                  {actionModal.type === "VERIFY"
                    ? "Officially validate this civic problem with the Government-Verified trust badge."
                    : "Decline government verification. The problem will remain active and visible in the Problem Bank."}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-900 block truncate">
                {actionModal.problem.title}
              </span>
              <span className="text-slate-500">
                {actionModal.problem.district} • Priority Score: {actionModal.problem.priorityScore}
              </span>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {actionModal.type === "VERIFY"
                  ? "Verification Remarks (Optional / Ground Audit Notes):"
                  : "Decline Reason / Remarks:"}
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder="Enter administrative notes or ground audit findings..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmittingAction}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors shadow-sm flex items-center gap-1.5 ${
                  actionModal.type === "VERIFY"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isSubmittingAction ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : actionModal.type === "VERIFY" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>
                  {actionModal.type === "VERIFY"
                    ? "Confirm Verification"
                    : "Confirm Decline"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
