import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Briefcase, Plus, AlertTriangle } from "lucide-react";
import { ProjectTrack } from "../../types";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

interface CreateProjectModalProps {
  initialProblemId?: string;
  initialProblemTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newProject: any) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  initialProblemId,
  initialProblemTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [technicalApproach, setTechnicalApproach] = useState("");
  const [trackType, setTrackType] = useState<ProjectTrack>(
    user?.role === "UNIVERSITY"
      ? "ACADEMIC_RESEARCH"
      : user?.role === "STARTUP"
      ? "COMMERCIAL_VENTURE"
      : "CIVIC_INITIATIVE"
  );
  const [problemId, setProblemId] = useState(initialProblemId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!problemId.trim()) {
      setError("A project must be linked to at least one authentic problem ID.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          executiveSummary: executiveSummary.trim(),
          technicalApproach: technicalApproach.trim(),
          trackType,
          problemIds: [problemId.trim()],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize solution project.");
      }

      onClose();
      if (onSuccess) {
        onSuccess(data.project);
      } else {
        navigate(`/projects/${data.project.id}`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred creating the project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Initiate V3 Solution Project</h3>
              <span className="text-[11px] text-slate-500">
                Formal multi-stakeholder delivery vehicle
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {initialProblemTitle && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="font-bold text-emerald-900 block">Addressing Civic Challenge:</span>
              <span className="text-emerald-800 line-clamp-1">{initialProblemTitle}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Project Title</label>
            <input
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Namkum Village Biosand Arsenic Remediation"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Project Delivery Track</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTrackType("ACADEMIC_RESEARCH")}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  trackType === "ACADEMIC_RESEARCH"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                Academic Research
              </button>
              <button
                type="button"
                onClick={() => setTrackType("COMMERCIAL_VENTURE")}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  trackType === "COMMERCIAL_VENTURE"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                Commercial Venture
              </button>
              <button
                type="button"
                onClick={() => setTrackType("CIVIC_INITIATIVE")}
                className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                  trackType === "CIVIC_INITIATIVE"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                Civic Initiative
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Executive Summary</label>
            <textarea
              required
              minLength={10}
              rows={2}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="Brief summary of what this project aims to achieve and impact..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Technical / Delivery Approach</label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={technicalApproach}
              onChange={(e) => setTechnicalApproach(e.target.value)}
              placeholder="Engineering methodology, deployment plan, milestone stages..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {!initialProblemId && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Problem UUID</label>
              <input
                type="text"
                required
                value={problemId}
                onChange={(e) => setProblemId(e.target.value)}
                placeholder="UUID of problem from Problem Bank"
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Creating..." : "Initialize Project"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
