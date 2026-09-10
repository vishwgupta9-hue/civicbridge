import React, { useState } from "react";
import {
  GraduationCap,
  Rocket,
  Building2,
  PlusCircle,
  X,
  MessageSquare,
} from "lucide-react";
import { Role } from "../../types";
import { API_BASE_URL } from "../../config/api";

interface ProgressItem {
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
  progressUpdates?: ProgressItem[];
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
  progressUpdates?: ProgressItem[];
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

interface ProblemV2TabsProps {
  problemId: string;
  proposals: ProposalItem[];
  concepts: BusinessConceptItem[];
  collaborations: CollaborationItem[];
  userRole?: Role;
  userOrgId?: string | null;
  token?: string | null;
  onRefresh: () => Promise<void>;
}

export const ProblemV2Tabs: React.FC<ProblemV2TabsProps> = ({
  problemId,
  proposals,
  concepts,
  collaborations,
  userRole,
  userOrgId,
  token,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<"proposals" | "concepts" | "collaborations">("proposals");

  // Modals
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressTarget, setProgressTarget] = useState<{
    type: "proposal" | "concept" | "collab";
    id: string;
    title: string;
  } | null>(null);

  // Form states
  const [proposalForm, setProposalForm] = useState({
    title: "",
    proposedApproach: "",
    facultyMentor: "",
    deliverables: "",
  });

  const [conceptForm, setConceptForm] = useState({
    title: "",
    solutionDescription: "",
    targetBeneficiaries: "",
    businessModel: "",
  });

  const [collabForm, setCollabForm] = useState({
    supportType: "MENTORSHIP",
    message: "",
  });

  const [progressForm, setProgressForm] = useState({
    updateText: "",
    status: "IN_PROGRESS",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: proposalForm.title,
          description: proposalForm.proposedApproach,
          facultyMentor: proposalForm.facultyMentor,
          deliverables: proposalForm.deliverables,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit proposal");
      setFeedback({ type: "success", text: "Research proposal submitted successfully!" });
      setShowProposalModal(false);
      setProposalForm({ title: "", proposedApproach: "", facultyMentor: "", deliverables: "" });
      await onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/business-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: conceptForm.title,
          description: conceptForm.solutionDescription,
          targetBeneficiaries: conceptForm.targetBeneficiaries,
          businessModel: conceptForm.businessModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit concept");
      setFeedback({ type: "success", text: "Business concept submitted successfully!" });
      setShowConceptModal(false);
      setConceptForm({ title: "", solutionDescription: "", targetBeneficiaries: "", businessModel: "" });
      await onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/problems/${problemId}/collaborations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          supportType: collabForm.supportType,
          description: collabForm.message,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to offer collaboration");
      setFeedback({ type: "success", text: "Industry collaboration offer submitted successfully!" });
      setShowCollabModal(false);
      setCollabForm({ supportType: "MENTORSHIP", message: "" });
      await onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !progressTarget) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      let endpoint = "";
      if (progressTarget.type === "proposal") {
        endpoint = `${API_BASE_URL}/proposals/${progressTarget.id}/progress`;
      } else if (progressTarget.type === "concept") {
        endpoint = `${API_BASE_URL}/business-concepts/${progressTarget.id}/progress`;
      } else {
        endpoint = `${API_BASE_URL}/collaborations/${progressTarget.id}/progress`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(progressForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to post progress update");
      setFeedback({ type: "success", text: "Progress update logged!" });
      setShowProgressModal(false);
      setProgressTarget(null);
      setProgressForm({ updateText: "", status: "IN_PROGRESS" });
      await onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab("proposals")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "proposals"
              ? "border-emerald-600 text-emerald-700 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Academic Proposals ({proposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("concepts")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "concepts"
              ? "border-emerald-600 text-emerald-700 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>Startup Solutions ({concepts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("collaborations")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "collaborations"
              ? "border-emerald-600 text-emerald-700 bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Industry CSR Offers ({collaborations.length})</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 text-xs flex items-center justify-between ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div className="p-5 space-y-4">
        {/* Proposals Tab */}
        {activeTab === "proposals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                University R&D and capstone research proposals addressing this problem.
              </span>
              {userRole === "UNIVERSITY" && userOrgId && (
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Submit Proposal</span>
                </button>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <GraduationCap className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700">No university proposals submitted yet.</p>
                <p className="text-[11px] text-slate-500">
                  Universities can submit structured project plans with faculty mentorship.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((prop) => (
                  <div key={prop.id} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {prop.title || "Academic Research Proposal"}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {prop.university?.name || "University Partner"} • Mentor: {prop.facultyMentor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                          {prop.status}
                        </span>
                        {userOrgId && prop.universityId === userOrgId && (
                          <button
                            onClick={() => {
                              setProgressTarget({ type: "proposal", id: prop.id, title: prop.title || "Proposal" });
                              setShowProgressModal(true);
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Update</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700">{prop.proposedApproach}</p>
                    {prop.deliverables && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                        <strong>Deliverables: </strong> {prop.deliverables}
                      </div>
                    )}
                    {/* Progress updates */}
                    {prop.progressUpdates && prop.progressUpdates.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Latest Updates:</span>
                        {prop.progressUpdates.slice(0, 2).map((u) => (
                          <div key={u.id} className="text-[11px] text-slate-600 flex items-center justify-between">
                            <span>{u.updateText}</span>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Business Concepts Tab */}
        {activeTab === "concepts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Early-stage entrepreneurial commercialization & venture models.
              </span>
              {userRole === "STARTUP" && userOrgId && (
                <button
                  onClick={() => setShowConceptModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Submit Concept</span>
                </button>
              )}
            </div>

            {concepts.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Rocket className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700">No startup business concepts filed yet.</p>
                <p className="text-[11px] text-slate-500">
                  Jharkhand startups can propose commercial or sustainable models.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {concepts.map((concept) => (
                  <div key={concept.id} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {concept.title || "Startup Solution Concept"}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {concept.startup?.name || "Startup Partner"} ({concept.startup?.district || "Jharkhand"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                          {concept.status}
                        </span>
                        {userOrgId && concept.startupId === userOrgId && (
                          <button
                            onClick={() => {
                              setProgressTarget({ type: "concept", id: concept.id, title: concept.title || "Concept" });
                              setShowProgressModal(true);
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Update</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700">{concept.solutionDescription}</p>
                    {concept.businessModel && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                        <strong>Business Model: </strong> {concept.businessModel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Industry Collaborations Tab */}
        {activeTab === "collaborations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Corporate Social Responsibility (CSR), technical sponsorship, and co-development.
              </span>
              {userRole === "INDUSTRY" && userOrgId && (
                <button
                  onClick={() => setShowCollabModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Offer Collaboration</span>
                </button>
              )}
            </div>

            {collaborations.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Building2 className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700">No industry CSR commitments registered yet.</p>
                <p className="text-[11px] text-slate-500">
                  Industrial partners can offer funding, equipment, or mentorship.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {collaborations.map((collab) => (
                  <div key={collab.id} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {collab.industry?.name || "Industry Partner"}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Support Type: <strong>{collab.supportType}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 uppercase">
                        {collab.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{collab.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Update Modal */}
      {showProgressModal && progressTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Log Progress Update</h3>
              <button onClick={() => setShowProgressModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleProgressSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target</label>
                <span className="text-slate-600 bg-slate-50 p-2 rounded block">{progressTarget.title}</span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Update Status</label>
                <select
                  value={progressForm.status}
                  onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Progress Summary</label>
                <textarea
                  required
                  rows={3}
                  value={progressForm.updateText}
                  onChange={(e) => setProgressForm({ ...progressForm, updateText: e.target.value })}
                  placeholder="Summarize recent field activities, research milestones, or blockers..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? "Posting..." : "Post Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Submit University Research Proposal</h3>
              <button onClick={() => setShowProposalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleProposalSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                  placeholder="e.g. Low-cost Biosand Filtration Capstone"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Faculty Mentor</label>
                <input
                  type="text"
                  required
                  value={proposalForm.facultyMentor}
                  onChange={(e) => setProposalForm({ ...proposalForm, facultyMentor: e.target.value })}
                  placeholder="e.g. Dr. Ananya Sen, Dept of Civil Engineering"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Proposed Technical Approach</label>
                <textarea
                  required
                  rows={3}
                  value={proposalForm.proposedApproach}
                  onChange={(e) => setProposalForm({ ...proposalForm, proposedApproach: e.target.value })}
                  placeholder="Methodology, student team roles, and laboratory validation plan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expected Deliverables</label>
                <input
                  type="text"
                  value={proposalForm.deliverables}
                  onChange={(e) => setProposalForm({ ...proposalForm, deliverables: e.target.value })}
                  placeholder="e.g. Working prototype, water quality testing report"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Concept Modal */}
      {showConceptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Submit Startup Business Concept</h3>
              <button onClick={() => setShowConceptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConceptSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Concept Title</label>
                <input
                  type="text"
                  required
                  value={conceptForm.title}
                  onChange={(e) => setConceptForm({ ...conceptForm, title: e.target.value })}
                  placeholder="e.g. Automated Solar Water Purification ATM"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Solution Description</label>
                <textarea
                  required
                  rows={3}
                  value={conceptForm.solutionDescription}
                  onChange={(e) => setConceptForm({ ...conceptForm, solutionDescription: e.target.value })}
                  placeholder="How does your startup solve this problem commercially or sustainably?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Beneficiaries / Customers</label>
                <input
                  type="text"
                  value={conceptForm.targetBeneficiaries}
                  onChange={(e) => setConceptForm({ ...conceptForm, targetBeneficiaries: e.target.value })}
                  placeholder="e.g. Rural households, municipal schools, panchayats"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business / Sustainability Model</label>
                <input
                  type="text"
                  value={conceptForm.businessModel}
                  onChange={(e) => setConceptForm({ ...conceptForm, businessModel: e.target.value })}
                  placeholder="e.g. Pay-per-liter dispensing with community maintenance"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConceptModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Concept"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collab Modal */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Offer Industry CSR Collaboration</h3>
              <button onClick={() => setShowCollabModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCollabSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Support Type</label>
                <select
                  value={collabForm.supportType}
                  onChange={(e) => setCollabForm({ ...collabForm, supportType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="MENTORSHIP">Domain Mentorship & Advisory</option>
                  <option value="TECHNICAL">Technical Co-development</option>
                  <option value="PROTOTYPING">Prototyping & Equipment Supply</option>
                  <option value="GENERAL_INTEREST">General CSR Interest</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Collaboration Offer Details</label>
                <textarea
                  required
                  rows={3}
                  value={collabForm.message}
                  onChange={(e) => setCollabForm({ ...collabForm, message: e.target.value })}
                  placeholder="Describe your organization's commitment and support scope..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollabModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
