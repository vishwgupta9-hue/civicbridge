import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { NavigationBar } from "../components/layout/NavigationBar";
import { ProblemHeader } from "../components/problem/ProblemHeader";
import { ProblemAIAnalysisCard } from "../components/problem/ProblemAIAnalysisCard";
import { ProblemOverview } from "../components/problem/ProblemOverview";
import { ProblemV2Tabs } from "../components/problem/ProblemV2Tabs";
import { ProblemV3ProjectsCard } from "../components/problem/ProblemV3ProjectsCard";
import { ProblemV3PilotsCard } from "../components/problem/ProblemV3PilotsCard";
import { CommentsSection } from "../components/problem/CommentsSection";
import { CommunityEvidenceTimeline } from "../components/problem/CommunityEvidenceTimeline";
import { CreateProjectModal } from "../components/project/CreateProjectModal";
import { ProjectRecord, PilotDeploymentRecord } from "../types";
import { AlertTriangle, RotateCcw } from "lucide-react";

export const ProblemDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [problem, setProblem] = useState<any | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [pilots, setPilots] = useState<PilotDeploymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Problem Details
      const probRes = await fetch(`${API_BASE_URL}/problems/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (probRes.status === 404) {
        throw new Error(`Problem #${id} was not found.`);
      }

      const probData = await probRes.json();
      if (!probRes.ok || !probData.success) {
        throw new Error(probData.error || "Failed to load problem record.");
      }
      setProblem(probData.problem);

      // 2. Fetch V3 Projects addressing this problem (Non-blocking if error)
      try {
        const projRes = await fetch(`${API_BASE_URL}/projects?problemId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          if (projData.success && Array.isArray(projData.projects)) {
            setProjects(projData.projects);
          }
        }
      } catch (e) {
        console.warn("Could not load associated projects:", e);
      }

      // 3. Fetch V3 Field Pilots deployed for this problem (Non-blocking)
      try {
        const pilotRes = await fetch(`${API_BASE_URL}/pilots?problemId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pilotRes.ok) {
          const pilotData = await pilotRes.json();
          if (pilotData.success && Array.isArray(pilotData.pilots)) {
            setPilots(pilotData.pilots);
          }
        }
      } catch (e) {
        console.warn("Could not load associated pilots:", e);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load problem details.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar activeSection="problems" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading Civic Problem Dossier...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar activeSection="problems" />
        <div className="flex-1 max-w-xl mx-auto w-full p-6 flex items-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4 w-full">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Problem Not Found or Inaccessible</h2>
              <p className="text-xs text-slate-500 mt-1">{error || "Could not retrieve the requested challenge."}</p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/problems"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back to Problem Bank
              </Link>
              <button
                onClick={() => loadData()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavigationBar activeSection="problems" />

      {/* Header with Badges & Trust State */}
      <ProblemHeader
        id={problem.id}
        title={problem.title}
        category={problem.category}
        subCategory={problem.subCategory}
        district={problem.district}
        locationText={problem.locationText}
        affectedCount={problem.affectedCount}
        priorityTier={problem.priorityTier}
        priorityScore={problem.priorityScore}
        verificationStatus={problem.verificationStatus}
        status={problem.status}
        createdAt={problem.createdAt}
      />

      {/* Main Multi-Column Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Main Column (7 cols): Narrative, AI Insights, Solution Projects, Pilots */}
          <div className="lg:col-span-7 space-y-6">
            {/* Overview Card */}
            <ProblemOverview
              description={problem.description}
              district={problem.district}
              locationText={problem.locationText}
              latitude={problem.latitude}
              longitude={problem.longitude}
              affectedCount={problem.affectedCount}
              evidenceUrl={problem.evidenceUrl}
              verificationStatus={problem.verificationStatus}
              verificationNotes={problem.verificationNotes}
              verifiedAt={problem.verifiedAt}
              verifiedBy={problem.verifiedBy}
              submittedBy={problem.submittedBy}
            />

            {/* Civic Lifecycle & Community Evidence Timeline */}
            <CommunityEvidenceTimeline
              problemId={problem.id}
              problemTitle={problem.title}
              initialCreatedAt={problem.createdAt}
              submitterName={problem.submittedBy?.name}
              verificationStatus={problem.verificationStatus}
              verifiedAt={problem.verifiedAt}
              verifiedBy={problem.verifiedBy}
              hasProposals={(problem.proposals?.length || 0) > 0}
              hasProjects={projects.length > 0}
              hasPilots={pilots.length > 0}
              isResolved={problem.status === "RESOLVED"}
              onEvidenceAdded={loadData}
            />

            {/* Community Discussion & Comments Section */}
            <CommentsSection problemId={problem.id} />

            {/* V3 Projects Section */}
            <ProblemV3ProjectsCard
              problemId={problem.id}
              problemTitle={problem.title}
              projects={projects}
              userRole={user?.role}
              hasOrg={!!user?.organizationId}
              onOpenCreateProject={() => setShowCreateProjectModal(true)}
            />

            {/* V3 Pilots Section */}
            <ProblemV3PilotsCard pilots={pilots} />
          </div>

          {/* Right Column (5 cols): AI Screening Card & V2 Collaboration Tabs */}
          <div className="lg:col-span-5 space-y-6">
            {/* AI Screening Insights */}
            <ProblemAIAnalysisCard analysis={problem.aiAnalysis} />

            {/* Preserved V2 Proposals, Concepts, CSR Collaborations & Industry Deployments */}
            <ProblemV2Tabs
              problemId={problem.id}
              proposals={problem.proposals || []}
              concepts={problem.businessConcepts || []}
              collaborations={problem.collaborations || []}
              industryProposals={problem.industryProposals || []}
              userRole={user?.role}
              userOrgId={user?.organizationId}
              token={token}
              onRefresh={loadData}
            />
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        initialProblemId={problem.id}
        initialProblemTitle={problem.title}
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSuccess={() => {
          setShowCreateProjectModal(false);
          loadData();
        }}
      />
    </div>
  );
};

export default ProblemDetailsPage;
