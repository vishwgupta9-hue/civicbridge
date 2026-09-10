import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import {
  Camera,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
  X,
  Rocket,
  Building2,
} from "lucide-react";

export interface EvidenceUpdateItem {
  id: string;
  problemId: string;
  title: string;
  description: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  submittedBy: {
    id: string;
    name: string;
    role: string;
    district?: string | null;
  };
}

interface CommunityEvidenceTimelineProps {
  problemId: string;
  problemTitle: string;
  initialCreatedAt: string;
  submitterName?: string;
  verificationStatus?: string;
  verifiedAt?: string | null;
  verifiedBy?: { name: string } | null;
  hasProposals?: boolean;
  hasProjects?: boolean;
  hasPilots?: boolean;
  isResolved?: boolean;
  onEvidenceAdded?: () => void;
}

export const CommunityEvidenceTimeline: React.FC<CommunityEvidenceTimelineProps> = ({
  problemId,
  problemTitle,
  initialCreatedAt,
  submitterName,
  verificationStatus,
  verifiedAt,
  verifiedBy,
  hasProposals,
  hasProjects,
  hasPilots,
  isResolved,
  onEvidenceAdded,
}) => {
  const { user, token } = useAuth();
  const [updates, setUpdates] = useState<EvidenceUpdateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvidenceUpdates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/evidence-updates`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUpdates(data.updates || []);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    fetchEvidenceUpdates();
  }, [fetchEvidenceUpdates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError("Please sign in to submit evidence updates.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setFormError("Title and description are required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/evidence-updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          photoUrl: photoUrl.trim() || null,
          videoUrl: videoUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit evidence update.");
      }

      setTitle("");
      setDescription("");
      setPhotoUrl("");
      setVideoUrl("");
      setShowModal(false);
      await fetchEvidenceUpdates();
      if (onEvidenceAdded) onEvidenceAdded();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit evidence.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Civic Lifecycle & Evidence Timeline</h3>
            <p className="text-[11px] text-slate-500">
              Chronological on-the-ground updates contributed by citizens and officials
            </p>
          </div>
        </div>

        {user && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors min-h-[40px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Evidence Update</span>
          </button>
        )}
      </div>

        {/* Chronological Vertical Timeline */}
        {isLoading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading chronological timeline...</div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {/* Step 1: Problem Reported */}
            <div className="relative">
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Problem Reported</span>
              <span className="text-[10px] text-slate-400">
                {new Date(initialCreatedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Report registered by {submitterName || "verified citizen"}. AI Zero-Gate screening passed and published to statewide Problem Bank.
            </p>
          </div>
        </div>

        {/* Step 2: Citizen Evidence Updates */}
        {updates.map((update, idx) => (
          <div key={update.id} className="relative">
            <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div className="bg-teal-50/40 p-4 rounded-xl border border-teal-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Evidence #{idx + 1}: {update.title}</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(update.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {update.description}
              </p>

              {/* Photo Preview if present */}
              {update.photoUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-w-sm">
                  <img
                    src={update.photoUrl}
                    alt={update.title}
                    className="w-full h-40 object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                    onClick={() => window.open(update.photoUrl!, "_blank")}
                  />
                </div>
              )}

              {update.videoUrl && (
                <a
                  href={update.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-1"
                >
                  <span>View Attached Media / Video Recording</span>
                  <ChevronRight className="w-3 h-3" />
                </a>
              )}

              <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-500">
                <User className="w-3 h-3" />
                <span>Contributed by {update.submittedBy.name} ({update.submittedBy.role})</span>
              </div>
            </div>
          </div>
        ))}

        {/* Step 3: Government Verification */}
        <div className="relative">
          <div
            className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs ${
              verificationStatus === "GOVERNMENT_VERIFIED"
                ? "bg-emerald-600"
                : "bg-slate-300 text-slate-600"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              verificationStatus === "GOVERNMENT_VERIFIED"
                ? "bg-emerald-50/50 border-emerald-200"
                : "bg-slate-50/60 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                {verificationStatus === "GOVERNMENT_VERIFIED"
                  ? "Government Verified"
                  : "Government Review Pending"}
              </span>
              {verifiedAt && (
                <span className="text-[10px] text-slate-400">
                  {new Date(verifiedAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              {verificationStatus === "GOVERNMENT_VERIFIED"
                ? `Officially endorsed by District Administration (${verifiedBy?.name || "Verified Official"}). Confirmed for institutional mobilization.`
                : "Problem is visible in statewide open Problem Bank. District verification pending formal audit."}
            </p>
          </div>
        </div>

        {/* Step 4: Solutions & Collaborations */}
        <div className="relative">
          <div
            className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs ${
              hasProposals || hasProjects ? "bg-indigo-600" : "bg-slate-300 text-slate-600"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Institutional Mobilization</span>
              <span className="text-[10px] text-slate-400">
                {hasProjects ? "Active Project" : hasProposals ? "Proposed" : "Open for Solutions"}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {hasProjects
                ? "Active multi-stakeholder project underway with universities, industry partners, or startups."
                : "Universities and startups can submit technical approaches and claim this problem."}
            </p>
          </div>
        </div>

        {/* Step 5: Field Pilot & Verification */}
        {hasPilots && (
          <div className="relative">
            <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
              <Rocket className="w-3.5 h-3.5" />
            </div>
            <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Field Pilot Deployment</span>
                <span className="text-[10px] text-purple-700 font-bold">Active On Ground</span>
              </div>
              <p className="text-xs text-slate-600">
                Physical testbed deployed on site with quantitative baseline/outcome metrics and stakeholder verification.
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Resolution */}
        <div className="relative">
          <div
            className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs ${
              isResolved ? "bg-emerald-600" : "bg-slate-200 text-slate-400"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div
            className={`p-3.5 rounded-xl border space-y-1 ${
              isResolved ? "bg-emerald-50 border-emerald-200" : "bg-slate-50/40 border-slate-200"
            }`}
          >
            <span className="text-xs font-bold text-slate-900">
              {isResolved ? "Civic Problem Resolved" : "Awaiting Final Resolution"}
            </span>
            <p className="text-xs text-slate-600">
              {isResolved
                ? "Independent impact verification confirmed. Solution verified in field."
                : "Community feedback and live progress updates continue until full on-ground resolution."}
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Add Evidence Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-bold text-slate-900">
                  Add Evidence Update {problemTitle ? `for "${problemTitle.slice(0, 30)}..."` : ""}
                </h4>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Update Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water turned cloudy again after recent rains"
                  required
                  maxLength={150}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exact ground conditions, dates, or measurements..."
                  required
                  maxLength={2000}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or uploaded photo link"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Video / External Link (Optional)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/... or cloud video recording"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors min-h-[40px]"
                >
                  {isSubmitting ? "Publishing..." : "Publish Evidence Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
