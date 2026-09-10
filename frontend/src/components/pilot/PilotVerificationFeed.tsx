import React, { useState } from "react";
import {
  ShieldCheck,
  FileCheck,
  PlusCircle,
  X,
  ExternalLink,
} from "lucide-react";
import {
  PilotVerificationRecord,
  VerificationFinding,
  EvidenceType,
  Role,
} from "../../types";
import { API_BASE_URL } from "../../config/api";

interface PilotVerificationFeedProps {
  pilotId: string;
  verifications: PilotVerificationRecord[];
  userRole?: Role;
  token?: string | null;
  onRefresh: () => Promise<void>;
}

export const PilotVerificationFeed: React.FC<PilotVerificationFeedProps> = ({
  pilotId,
  verifications,
  token,
  onRefresh,
}) => {
  const [showModal, setShowModal] = useState(false);

  const [finding, setFinding] = useState<VerificationFinding>("SUCCESS_CONFIRMED");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("PHOTO_GEOTAG");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [feedbackText, setFeedbackText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${pilotId}/verifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          finding,
          evidenceType,
          evidenceUrl: evidenceUrl.trim() || undefined,
          feedbackText: feedbackText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit field verification");
      }

      setShowModal(false);
      setEvidenceUrl("");
      setFeedbackText("");
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFindingBadge = (f: VerificationFinding) => {
    switch (f) {
      case "SUCCESS_CONFIRMED":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "PARTIAL_IMPROVEMENT":
        return "bg-blue-50 text-blue-800 border-blue-300";
      case "NO_CHANGE":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "FAILED":
        return "bg-rose-50 text-rose-800 border-rose-300";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Multi-Stakeholder Field Verifications ({verifications.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Independent audit findings from citizens, municipal officers, and academic experts
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Submit Verification</span>
        </button>
      </div>

      {verifications.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-1">
          <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">No field verifications submitted yet.</p>
          <p className="text-[11px] text-slate-500">
            Citizens and institutional stakeholders can submit ground evidence and validation reports.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {verifications.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getFindingBadge(
                      v.finding
                    )}`}
                  >
                    {v.finding.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Evidence: {v.evidenceType.replace(/_/g, " ")}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400">
                  {new Date(v.verifiedAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-slate-700 leading-relaxed">{v.feedbackText}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">
                  Verified by: {v.verifier?.name || "Field Auditor"} ({v.verificationRole})
                  {v.organization?.name && ` • ${v.organization.name}`}
                </span>

                {v.evidenceUrl && (
                  <a
                    href={v.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <span>Audit Evidence</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Submit Empirical Field Verification</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {error && <div className="p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Finding</label>
                <select
                  value={finding}
                  onChange={(e) => setFinding(e.target.value as VerificationFinding)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="SUCCESS_CONFIRMED">Success Confirmed (Objective Met)</option>
                  <option value="PARTIAL_IMPROVEMENT">Partial Improvement</option>
                  <option value="NO_CHANGE">No Meaningful Change Detected</option>
                  <option value="FAILED">Failed / Problem Persists</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="PHOTO_GEOTAG">Geotagged Field Photograph</option>
                  <option value="LAB_REPORT">Certified Laboratory Analysis Report</option>
                  <option value="SENSOR_DATASET">IoT Sensor Log Dataset</option>
                  <option value="WRITTEN_INSPECTION">Written On-Site Administrative Inspection</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Evidence Document / Photo URL (Optional)</label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://example.com/field-photo.jpg"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Findings / Feedback</label>
                <textarea
                  required
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Record your observations, community feedback, or lab findings..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                >
                  {isSubmitting ? "Submitting..." : "Submit Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
