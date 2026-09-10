import React, { useState } from "react";
import {
  GraduationCap,
  Rocket,
  Building2,
  PlusCircle,
  X,
  MessageSquare,
  Sparkles,
  Boxes,
} from "lucide-react";
import { Role, IndustryDeploymentProposal } from "../../types";
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
  industryProposals?: IndustryDeploymentProposal[];
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
  industryProposals = [],
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
  const [showIndustryProposalModal, setShowIndustryProposalModal] = useState(false);
  const [industryCapabilities, setIndustryCapabilities] = useState<any[]>([]);
  const [industryProposalForm, setIndustryProposalForm] = useState({
    capabilityId: "",
    providedItems: "",
    technicalCapability: "",
    relevantProductService: "",
    previousDeployment: "",
    deploymentRequirements: "",
    expectedTimeline: "4-6 Weeks",
    estimatedCost: "CSR Funded (INR 0 to Govt)",
    expectedCivicImpact: "",
  });
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
    if (collabForm.message.trim().length < 10) {
      setFeedback({ type: "error", text: "Collaboration message must be at least 10 characters." });
      return;
    }
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

  const handleOpenIndustryProposal = async () => {
    setShowIndustryProposalModal(true);
    if (token && userRole === "INDUSTRY") {
      try {
        const res = await fetch(`${API_BASE_URL}/industry/capabilities`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.capabilities)) {
          setIndustryCapabilities(json.capabilities);
        }
      } catch (err) {
        console.warn("Could not fetch user capabilities:", err);
      }
    }
  };

  const handleSelectIndustryCapability = (capId: string) => {
    const cap = industryCapabilities.find((c) => c.id === capId);
    if (!cap) {
      setIndustryProposalForm({ ...industryProposalForm, capabilityId: "" });
      return;
    }
    setIndustryProposalForm({
      ...industryProposalForm,
      capabilityId: cap.id,
      relevantProductService: cap.title,
      providedItems: `Deployment & commissioning of ${cap.title}`,
      technicalCapability: cap.description,
      previousDeployment: cap.caseStudies || industryProposalForm.previousDeployment,
    });
  };

  const handleIndustryProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (industryProposalForm.providedItems.trim().length < 5) {
      setFeedback({ type: "error", text: "Please describe what items/equipment your organization provides." });
      return;
    }
    if (industryProposalForm.technicalCapability.trim().length < 5) {
      setFeedback({ type: "error", text: "Please describe your technical capability." });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE_URL}/industry/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          problemId,
          capabilityId: industryProposalForm.capabilityId || null,
          providedItems: industryProposalForm.providedItems.trim(),
          technicalCapability: industryProposalForm.technicalCapability.trim(),
          relevantProductService: industryProposalForm.relevantProductService.trim() || null,
          previousDeployment: industryProposalForm.previousDeployment.trim() || null,
          deploymentRequirements: industryProposalForm.deploymentRequirements.trim() || null,
          expectedTimeline: industryProposalForm.expectedTimeline.trim(),
          estimatedCost: industryProposalForm.estimatedCost.trim() || null,
          expectedCivicImpact: industryProposalForm.expectedCivicImpact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit deployment proposal");
      setFeedback({ type: "success", text: "Capability & Deployment proposal submitted successfully!" });
      setShowIndustryProposalModal(false);
      setIndustryProposalForm({
        capabilityId: "",
        providedItems: "",
        technicalCapability: "",
        relevantProductService: "",
        previousDeployment: "",
        deploymentRequirements: "",
        expectedTimeline: "4-6 Weeks",
        estimatedCost: "CSR Funded (INR 0 to Govt)",
        expectedCivicImpact: "",
      });
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
          <span>Industry Solutions ({(industryProposals?.length || 0) + collaborations.length})</span>
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
                  <div key={concept.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {concept.marketSize || concept.title || "Startup Solution Proposal"}
                        </h4>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{concept.startup?.name || "Startup Partner"}</span>
                          {concept.startup?.district && <span>· {concept.startup.district}</span>}
                          {concept.createdAt && (
                            <span className="text-slate-400">· {new Date(concept.createdAt).toLocaleDateString()}</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 uppercase">
                          {concept.currentStage?.replace("_", " ") || concept.status || "Submitted"}
                        </span>
                        {userOrgId && concept.startupId === userOrgId && (
                          <button
                            onClick={() => {
                              setProgressTarget({ type: "concept", id: concept.id, title: concept.marketSize || concept.title || "Concept" });
                              setShowProgressModal(true);
                            }}
                            className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Update</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      {concept.solutionDescription}
                    </div>

                    {concept.businessModel && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line">
                        {concept.businessModel}
                      </div>
                    )}

                    {concept.revenueModel && !concept.businessModel?.includes(concept.revenueModel) && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        <strong>Financial Model: </strong> {concept.revenueModel}
                      </div>
                    )}

                    {concept.sustainabilityModel && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-line">
                        {concept.sustainabilityModel}
                      </div>
                    )}

                    {/* Progress updates if any */}
                    {concept.progressUpdates && concept.progressUpdates.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Latest Updates:</span>
                        {concept.progressUpdates.slice(0, 2).map((u) => (
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

        {/* Industry Collaborations & Deployments Tab */}
        {activeTab === "collaborations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Industrial hardware, testing facilities, and technical deployment proposals.
              </span>
              {userRole === "INDUSTRY" && userOrgId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenIndustryProposal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>How Can We Contribute?</span>
                  </button>
                  <button
                    onClick={() => setShowCollabModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Quick Offer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Display Industry Deployment Proposals */}
            {industryProposals && industryProposals.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-teal-600" />
                  Industrial Capability & Deployment Proposals ({industryProposals.length})
                </h4>
                {industryProposals.map((prop) => (
                  <div key={prop.id} className="p-4 rounded-xl border border-teal-200 bg-teal-50/20 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {prop.organization?.name || "Industry Partner"}
                          </h4>
                          {prop.organization?.companyType && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                              {prop.organization.companyType}
                            </span>
                          )}
                        </div>
                        {prop.relevantProductService && (
                          <span className="text-xs text-teal-800 font-semibold block mt-0.5">
                            Product/Service: {prop.relevantProductService}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                        {prop.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-100">
                      <div>
                        <strong className="text-slate-800">What Partner Provides:</strong>{" "}
                        <span className="text-slate-600">{prop.providedItems}</span>
                      </div>
                      <div>
                        <strong className="text-slate-800">Technical Capability:</strong>{" "}
                        <span className="text-slate-600">{prop.technicalCapability}</span>
                      </div>
                      {prop.deploymentRequirements && (
                        <div>
                          <strong className="text-slate-800">Deployment Requirements:</strong>{" "}
                          <span className="text-slate-600">{prop.deploymentRequirements}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 flex-wrap gap-2">
                      <span>Timeline: <strong>{prop.expectedTimeline}</strong></span>
                      <span>Cost: <strong>{prop.estimatedCost || "CSR Funded"}</strong></span>
                    </div>

                    {prop.expectedCivicImpact && (
                      <div className="text-[11px] text-emerald-900 bg-emerald-50 p-2 rounded-md border border-emerald-100">
                        <strong>Expected Civic Impact:</strong> {prop.expectedCivicImpact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Display General Collaborations */}
            {collaborations.length > 0 && (
              <div className="space-y-3">
                {industryProposals && industryProposals.length > 0 && (
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide pt-2">
                    Additional CSR & Mentorship Offers ({collaborations.length})
                  </h4>
                )}
                {collaborations.map((collab) => (
                  <div key={collab.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
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

            {(!industryProposals || industryProposals.length === 0) && collaborations.length === 0 && (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                <Building2 className="w-7 h-7 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">No industry commitments or deployment proposals yet.</p>
                <p className="text-[11px] text-slate-500">
                  Industrial partners can propose engineered hardware, testing labs, or CSR deployment.
                </p>
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

      {/* Industry Deployment Proposal Modal */}
      {showIndustryProposalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in my-8">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-900 to-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold">How Can We Contribute? — Propose Solution / Deployment</h3>
              </div>
              <button
                onClick={() => setShowIndustryProposalModal(false)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIndustryProposalSubmit} className="p-5 space-y-4 text-xs">
              {industryCapabilities.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Pre-fill from Published Catalog Item (Optional)
                  </label>
                  <select
                    value={industryProposalForm.capabilityId}
                    onChange={(e) => handleSelectIndustryCapability(e.target.value)}
                    className="w-full px-3 py-2 bg-teal-50/50 border border-teal-200 rounded-xl text-teal-950 font-medium"
                  >
                    <option value="">-- Custom Engineering Solution --</option>
                    {industryCapabilities.map((cap) => (
                      <option key={cap.id} value={cap.id}>
                        [{cap.type}] {cap.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">What Your Company Provides *</label>
                <textarea
                  required
                  rows={2}
                  value={industryProposalForm.providedItems}
                  onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, providedItems: e.target.value })}
                  placeholder="e.g. 3x Industrial Slag & Carbon Adsorption Units with complete manifolds"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technical Capability Deployed *</label>
                <textarea
                  required
                  rows={2}
                  value={industryProposalForm.technicalCapability}
                  onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, technicalCapability: e.target.value })}
                  placeholder="e.g. Continuous chemical effluent neutralization and heavy metal precipitation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Relevant Product / Service</label>
                  <input
                    type="text"
                    value={industryProposalForm.relevantProductService}
                    onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, relevantProductService: e.target.value })}
                    placeholder="e.g. Adsorption Unit TS-ADS-2500"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Previous Deployment Track Record</label>
                  <input
                    type="text"
                    value={industryProposalForm.previousDeployment}
                    onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, previousDeployment: e.target.value })}
                    placeholder="e.g. Deployed in Jamshedpur industrial corridor"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deployment Requirements</label>
                <input
                  type="text"
                  value={industryProposalForm.deploymentRequirements}
                  onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, deploymentRequirements: e.target.value })}
                  placeholder="e.g. Site clearance from district administration; 15 sqm level concrete pad"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Timeline *</label>
                  <input
                    type="text"
                    required
                    value={industryProposalForm.expectedTimeline}
                    onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, expectedTimeline: e.target.value })}
                    placeholder="e.g. 4-6 Weeks"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Cost / CSR Budget</label>
                  <input
                    type="text"
                    value={industryProposalForm.estimatedCost}
                    onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, estimatedCost: e.target.value })}
                    placeholder="e.g. CSR Funded (INR 0 to Govt)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expected Civic Impact *</label>
                <textarea
                  required
                  rows={2}
                  value={industryProposalForm.expectedCivicImpact}
                  onChange={(e) => setIndustryProposalForm({ ...industryProposalForm, expectedCivicImpact: e.target.value })}
                  placeholder="e.g. Neutralizes heavy metal effluent, restoring water safety for 1,500 downstream residents."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIndustryProposalModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {isSubmitting ? "Submitting..." : "Submit Deployment Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
