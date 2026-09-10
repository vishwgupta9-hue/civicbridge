import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { ClearanceStatus, Role } from "../../types";
import { API_BASE_URL } from "../../config/api";

interface PilotClearanceCardProps {
  pilotId: string;
  clearanceStatus: ClearanceStatus;
  clearanceDocumentUrl?: string | null;
  clearanceNotes?: string | null;
  clearanceRequestedAt?: string | null;
  clearanceDecidedAt?: string | null;
  clearedBy?: { id: string; name: string; role: Role } | null;
  userRole?: Role;
  isLeadOrResponsible: boolean;
  token?: string | null;
  onRefresh: () => Promise<void>;
}

export const PilotClearanceCard: React.FC<PilotClearanceCardProps> = ({
  pilotId,
  clearanceStatus,
  clearanceDocumentUrl,
  clearanceNotes,
  clearanceRequestedAt,
  clearanceDecidedAt,
  clearedBy,
  userRole,
  isLeadOrResponsible,
  token,
  onRefresh,
}) => {
  const isAdmin = userRole === "ADMIN";

  // Modal forms
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Request form
  const [reqDocUrl, setReqDocUrl] = useState(clearanceDocumentUrl || "");
  const [reqNotes, setReqNotes] = useState("");

  // Decision form (Admin only)
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "NEEDS_MORE_INFO">("APPROVED");
  const [decisionNotes, setDecisionNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${pilotId}/clearance/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clearanceDocumentUrl: reqDocUrl.trim() || undefined,
          clearanceNotes: reqNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit clearance request");
      setShowRequestModal(false);
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewClearance = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${pilotId}/clearance/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to place clearance under review");
      await onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${pilotId}/clearance/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          decision,
          clearanceNotes: decisionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record clearance decision");
      setShowDecisionModal(false);
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusDisplay = () => {
    switch (clearanceStatus) {
      case "APPROVED":
      case "GRANTED":
        return {
          color: "bg-emerald-50 text-emerald-800 border-emerald-300",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: "Government Clearance Approved (NOC Issued)",
          desc: "Field deployment authorized by district administrative authority.",
        };
      case "REJECTED":
      case "DECLINED":
        return {
          color: "bg-rose-50 text-rose-800 border-rose-300",
          icon: <XCircle className="w-4 h-4 text-rose-600" />,
          label: "Clearance Rejected by District Authority",
          desc: "Deployment authorization declined. Field operations prohibited.",
        };
      case "NEEDS_MORE_INFO":
        return {
          color: "bg-amber-50 text-amber-800 border-amber-300",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: "Additional Information Required",
          desc: "District officials requested safety amendments or site documents before clearance.",
        };
      case "UNDER_REVIEW":
        return {
          color: "bg-blue-50 text-blue-800 border-blue-300",
          icon: <Clock className="w-4 h-4 text-blue-600" />,
          label: "Government Official Review In Progress",
          desc: "Field protocol currently under evaluation by district municipal authorities.",
        };
      case "REQUESTED":
        return {
          color: "bg-amber-50 text-amber-800 border-amber-300",
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          label: "Clearance Application Submitted (Pending Review)",
          desc: "Awaiting administrative review by government officer.",
        };
      case "REQUIRED":
        return {
          color: "bg-amber-50 text-amber-800 border-amber-300",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: "Official Clearance Required Before Activation",
          desc: "This pilot involves public infrastructure or community sites and requires government NOC.",
        };
      case "NOT_REQUIRED":
      default:
        return {
          color: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <CheckCircle2 className="w-4 h-4 text-slate-500" />,
          label: "Standard Deployment (No Official NOC Required)",
          desc: "Private research or lab testing testbed. Authorized to activate directly once prepared.",
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Government Clearance & NOC Workflow
            </h3>
            <span className="text-[11px] text-slate-500">
              Parallel trust gate: District administrative authorization
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Solver Request Action */}
          {isLeadOrResponsible &&
            (clearanceStatus === "REQUIRED" || clearanceStatus === "NEEDS_MORE_INFO") && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
              >
                {clearanceStatus === "NEEDS_MORE_INFO" ? "Resubmit Clearance" : "Apply for Clearance"}
              </button>
            )}

          {/* Admin Decision Actions */}
          {isAdmin && clearanceStatus !== "NOT_REQUIRED" && (
            <div className="flex items-center gap-1.5">
              {clearanceStatus === "REQUESTED" && (
                <button
                  onClick={handleReviewClearance}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                >
                  Start Review
                </button>
              )}
              <button
                onClick={() => setShowDecisionModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
              >
                Issue Decision
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-xl border ${statusInfo.color} space-y-1`}>
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
          {statusInfo.icon}
          <span>{statusInfo.label}</span>
        </div>
        <p className="text-xs opacity-90 pl-6">{statusInfo.desc}</p>
      </div>

      {/* Additional details: Notes, Decided By, Requested date */}
      <div className="text-xs space-y-2 text-slate-600 pt-1">
        {clearanceNotes && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <strong className="text-slate-800 block mb-0.5">Administrative Notes:</strong>
            <span>{clearanceNotes}</span>
          </div>
        )}

        {clearanceDocumentUrl && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>NOC Document / Protocol: </span>
            <a
              href={clearanceDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>View Document</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          {clearanceRequestedAt && (
            <span>Requested: {new Date(clearanceRequestedAt).toLocaleDateString()}</span>
          )}
          {clearanceDecidedAt && (
            <span>Decided: {new Date(clearanceDecidedAt).toLocaleDateString()}</span>
          )}
          {clearedBy && (
            <span className="font-semibold text-slate-700">
              Authority Officer: {clearedBy.name} ({clearedBy.role})
            </span>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              {clearanceStatus === "NEEDS_MORE_INFO" ? "Resubmit Clearance Dossier" : "Apply for Government NOC Clearance"}
            </h3>
            {error && <div className="p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}
            <form onSubmit={handleRequestClearance} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Safety & Protocol Document URL</label>
                <input
                  type="url"
                  value={reqDocUrl}
                  onChange={(e) => setReqDocUrl(e.target.value)}
                  placeholder="https://example.com/pilot-safety-dossier.pdf"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Application Notes / Site Approvals</label>
                <textarea
                  rows={3}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Explain local panchayat consent, site security, or technical safety..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Issue Administrative Clearance Decision</h3>
            {error && <div className="p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}
            <form onSubmit={handleDecisionSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision("APPROVED")}
                    className={`py-1.5 px-2 rounded-lg border font-bold text-center ${
                      decision === "APPROVED" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision("NEEDS_MORE_INFO")}
                    className={`py-1.5 px-2 rounded-lg border font-bold text-center ${
                      decision === "NEEDS_MORE_INFO" ? "bg-amber-500 text-white border-amber-500" : "border-slate-200"
                    }`}
                  >
                    Need Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision("REJECTED")}
                    className={`py-1.5 px-2 rounded-lg border font-bold text-center ${
                      decision === "REJECTED" ? "bg-rose-600 text-white border-rose-600" : "border-slate-200"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Findings / Reasoning</label>
                <textarea
                  required
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Record formal municipal reasoning, site restrictions, or NOC conditions..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
