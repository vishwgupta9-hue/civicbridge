import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { NavigationBar } from "../components/layout/NavigationBar";
import { CreatePilotModal } from "../components/pilot/CreatePilotModal";
import { CreateNeedModal } from "../components/exchange/CreateNeedModal";
import {
  Building2,
  Calendar,
  Layers,
  PlusCircle,
  Activity,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { ProjectRecord, ProjectStatus } from "../types";

const STATUS_ORDER: ProjectStatus[] = [
  "PLANNING",
  "BUILDING",
  "PILOTING",
  "COMPLETED",
  "ABANDONED",
];

export const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showPilotModal, setShowPilotModal] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        throw new Error(`Project #${id} was not found.`);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load project dossier.");
      }

      setProject(data.project);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred loading project details.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!token || !id) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update project status.");
      }
      await fetchProject();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isLeadOrAdmin =
    user?.role === "ADMIN" ||
    (user?.organizationId && project?.leadOrgId === user.organizationId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar activeSection="problems" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading Solution Project Dossier...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar activeSection="problems" />
        <div className="flex-1 max-w-xl mx-auto w-full p-6 flex items-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4 w-full">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Not Found</h2>
              <p className="text-xs text-slate-500 mt-1">{error || "Could not retrieve the project dossier."}</p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/problems"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back to Problem Bank
              </Link>
              <button
                onClick={() => fetchProject()}
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
      <NavigationBar />

      {/* Project Header Banner */}
      <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Statewide Problem Bank</span>
            </Link>

            <span className="font-mono text-slate-400">
              Project ID: {project.id.slice(0, 8)}...{project.id.slice(-4)}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                  {project.trackType.replace(/_/g, " ")}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                  Status: {project.status.replace(/_/g, " ")}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {project.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <strong>Lead Org:</strong> {project.leadOrg?.name || "Lead Institution"} ({project.leadOrg?.district || "Jharkhand"})
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Initiated {new Date(project.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Status Transition Control (Lead Org / Admin only) */}
            {isLeadOrAdmin && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Advance Phase:</span>
                <select
                  disabled={isUpdatingStatus}
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                  className="bg-white px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                >
                  {STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Progress Timeline Stepper */}
          <div className="pt-2 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-[550px]">
              {STATUS_ORDER.map((st, i) => {
                const currentIndex = STATUS_ORDER.indexOf(project.status);
                const isPassed = i <= currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <React.Fragment key={st}>
                    <div
                      className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold text-center border uppercase transition-colors ${
                        isCurrent
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : isPassed
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      }`}
                    >
                      {st.replace(/_/g, " ")}
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dossier Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Dossier Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Executive Summary & Technical Approach */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Executive Summary
                </h3>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {project.executiveSummary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Technical & Engineering Approach
                </h3>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {project.technicalApproach}
                </p>
              </div>
            </div>

            {/* Addressed Civic Problems */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Addressed Civic Challenges ({(project.problems || []).length})
                  </h3>
                </div>
              </div>

              {(!project.problems || project.problems.length === 0) ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No problems linked to this project.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {project.problems.map(({ problem, isPrimary }) => (
                    <Link
                      key={problem.id}
                      to={`/problems/${problem.id}`}
                      className="block p-3.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {isPrimary && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                                Primary Target
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-slate-500">
                              {problem.category} • {problem.district}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {problem.title}
                          </h4>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors self-center" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Field Pilots Attached to this Project */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Field Execution Pilots ({(project.pilots || []).length})
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Empirical testbeds deploying this project's solution
                    </span>
                  </div>
                </div>

                {isLeadOrAdmin && (
                  <button
                    onClick={() => setShowPilotModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Propose Pilot</span>
                  </button>
                )}
              </div>

              {(!project.pilots || project.pilots.length === 0) ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-1">
                  <Activity className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">No pilots proposed for this project yet.</p>
                  {isLeadOrAdmin && (
                    <p className="text-[11px] text-slate-500">
                      Click "Propose Pilot" to define a field site and begin the government NOC clearance workflow.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {project.pilots.map((pilot) => (
                    <Link
                      key={pilot.id}
                      to={`/pilots/${pilot.id}`}
                      className="block p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                              {pilot.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              NOC: {pilot.clearanceStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {pilot.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>{pilot.siteLocation}, {pilot.district}</span>
                            <span>•</span>
                            <span>{pilot.targetBeneficiaryCount} Target Citizens</span>
                            {pilot.metrics && pilot.metrics.length > 0 && (
                              <span className="text-emerald-700 font-semibold">
                                • {pilot.metrics.length} Empirical Metric(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 self-center" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Resource Exchange Needs */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Resource Exchange Needs ({(project.needs || []).length})
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Equipment, lab testing, and CSR grants requested for this project
                    </span>
                  </div>
                </div>

                {isLeadOrAdmin && (
                  <button
                    onClick={() => setShowNeedModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Request Need</span>
                  </button>
                )}
              </div>

              {(!project.needs || project.needs.length === 0) ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No external resource needs posted for this project.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {project.needs.map((need) => (
                    <div key={need.id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 uppercase">
                          {need.category.replace(/_/g, " ")} • {need.urgency} Urgency
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">{need.status}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{need.title}</h4>
                      <p className="text-xs text-slate-600">{need.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Lead Org Profile, Collaborations, Milestones */}
          <div className="lg:col-span-4 space-y-6">
            {/* Lead Organization Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Lead Organization
              </h3>
              <div className="space-y-2 text-xs">
                <div className="text-sm font-bold text-slate-900">{project.leadOrg?.name}</div>
                <div className="text-slate-600">
                  Type: <strong>{project.leadOrg?.type}</strong>
                </div>
                <div className="text-slate-600">
                  District: <strong>{project.leadOrg?.district || "Jharkhand"}</strong>
                </div>
                {project.leadOrg?.contactEmail && (
                  <div className="text-slate-600 truncate">
                    Contact: <span className="text-emerald-700">{project.leadOrg.contactEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Active Collaborations */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Collaborations ({(project.collaborations || []).length})</span>
              </h3>

              {(!project.collaborations || project.collaborations.length === 0) ? (
                <p className="text-xs text-slate-500 py-2">
                  No active bilateral institutional collaborations connected yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {project.collaborations.map((collab) => (
                    <Link
                      key={collab.id}
                      to={`/collaborations/${collab.id}`}
                      className="block p-3 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900">{collab.providerOrg?.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                          {collab.status}
                        </span>
                      </div>
                      {collab.offer && (
                        <p className="text-[11px] text-slate-500 truncate">
                          Offer: {collab.offer.title}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Milestones Roadmap */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Project Milestones ({(project.milestones || []).length})</span>
              </h3>

              {(!project.milestones || project.milestones.length === 0) ? (
                <p className="text-xs text-slate-500 py-2">No milestone schedule defined.</p>
              ) : (
                <div className="space-y-2.5">
                  {project.milestones.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{m.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border">
                          {m.status}
                        </span>
                      </div>
                      {m.targetDate && (
                        <span className="text-[11px] text-slate-500 block">
                          Target: {new Date(m.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Propose Pilot Modal */}
      <CreatePilotModal
        projectId={project.id}
        problemId={project.problems?.[0]?.problemId}
        isOpen={showPilotModal}
        onClose={() => setShowPilotModal(false)}
        onSuccess={() => fetchProject()}
      />

      {/* Request Need Modal */}
      <CreateNeedModal
        projectId={project.id}
        projectTitle={project.title}
        isOpen={showNeedModal}
        onClose={() => setShowNeedModal(false)}
        onSuccess={() => fetchProject()}
      />
    </div>
  );
};

export default ProjectDetailsPage;
