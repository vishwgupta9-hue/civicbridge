import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { NavigationBar } from "../components/layout/NavigationBar";
import { PilotClearanceCard } from "../components/pilot/PilotClearanceCard";
import { PilotMetricsTable } from "../components/pilot/PilotMetricsTable";
import { PilotVerificationFeed } from "../components/pilot/PilotVerificationFeed";
import { PilotDossierModal } from "../components/pilot/PilotDossierModal";
import {
  Activity,
  Briefcase,
  Layers,
  ShieldCheck,
  Award,
  AlertTriangle,
  RotateCcw,
  Play,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { PilotDeploymentRecord, PilotStatus } from "../types";

const PILOT_LIFECYCLE: PilotStatus[] = [
  "PROPOSED",
  "PREPARATION",
  "ACTIVE_ON_GROUND",
  "EVALUATION",
  "CONCLUDED",
];

export const PilotDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [pilot, setPilot] = useState<PilotDeploymentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDossierModal, setShowDossierModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fetchPilot = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        throw new Error(`Pilot #${id} was not found.`);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load pilot deployment.");
      }

      setPilot(data.pilot);
    } catch (err: any) {
      setError(err.message || "Failed to load pilot details.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchPilot();
  }, [fetchPilot]);

  // Lifecycle transition handlers
  const handleAdvanceState = async (action: "prepare" | "activate" | "evaluate" | "conclude") => {
    if (!token || !id) return;
    setIsTransitioning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pilots/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to transition pilot state.`);
      }
      await fetchPilot();
    } catch (err: any) {
      alert(`Transition Blocked: ${err.message}`);
    } finally {
      setIsTransitioning(false);
    }
  };

  const isLeadOrResponsible = Boolean(
    user?.role === "ADMIN" ||
      (user?.organizationId &&
        (pilot?.responsibleOrgId === user.organizationId ||
          (pilot?.project as any)?.leadOrgId === user.organizationId))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading Field Pilot Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pilot) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <NavigationBar />
        <div className="flex-1 max-w-xl mx-auto w-full p-6 flex items-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4 w-full">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pilot Not Found</h2>
              <p className="text-xs text-slate-500 mt-1">{error || "Could not retrieve the pilot record."}</p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/problems"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Back to Problem Bank
              </Link>
              <button
                onClick={() => fetchPilot()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
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

  const getStatusColor = (st: PilotStatus) => {
    switch (st) {
      case "ACTIVE_ON_GROUND":
        return "bg-emerald-600 text-white";
      case "CONCLUDED":
        return "bg-slate-800 text-white";
      case "EVALUATION":
        return "bg-purple-600 text-white";
      case "PREPARATION":
        return "bg-blue-600 text-white";
      case "PROPOSED":
      default:
        return "bg-amber-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavigationBar />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {pilot.projectId ? (
              <Link
                to={`/projects/${pilot.projectId}`}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-700 font-semibold transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                <span>Back to Solution Project</span>
              </Link>
            ) : (
              <Link
                to="/problems"
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-700 font-semibold transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Problem Bank</span>
              </Link>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDossierModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Award className="w-4 h-4 text-emerald-600" />
                <span>View Impact Dossier</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusColor(
                    pilot.status
                  )}`}
                >
                  {pilot.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {pilot.siteLocation}, {pilot.district}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                {pilot.title}
              </h1>
            </div>

            {/* Lifecycle Action Buttons */}
            {isLeadOrResponsible && (
              <div className="flex flex-wrap items-center gap-2">
                {pilot.status === "PROPOSED" && (
                  <button
                    onClick={() => handleAdvanceState("prepare")}
                    disabled={isTransitioning}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4" />
                    <span>Begin Preparation</span>
                  </button>
                )}

                {pilot.status === "PREPARATION" && (
                  <button
                    onClick={() => handleAdvanceState("activate")}
                    disabled={isTransitioning}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    title={
                      pilot.clearanceStatus === "REQUIRED"
                        ? "Government NOC approval required before activation"
                        : "Activate field operations"
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Activate On-Ground</span>
                  </button>
                )}

                {pilot.status === "ACTIVE_ON_GROUND" && (
                  <button
                    onClick={() => handleAdvanceState("evaluate")}
                    disabled={isTransitioning}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Start Evaluation</span>
                  </button>
                )}

                {pilot.status === "EVALUATION" && (
                  <button
                    onClick={() => handleAdvanceState("conclude")}
                    disabled={isTransitioning}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Conclude Pilot</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stepper */}
          <div className="pt-2 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-[550px]">
              {PILOT_LIFECYCLE.map((st, i) => {
                const currentIndex = PILOT_LIFECYCLE.indexOf(pilot.status);
                const isPassed = i <= currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <React.Fragment key={st}>
                    <div
                      className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold text-center border uppercase transition-colors ${
                        isCurrent
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : isPassed
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      }`}
                    >
                      {st.replace(/_/g, " ")}
                    </div>
                    {i < PILOT_LIFECYCLE.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column (8 cols): Overview, Clearance Gate, Metrics Table */}
          <div className="lg:col-span-8 space-y-6">
            {/* Overview Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-500">
                Deployment Scope & Site Details
              </h3>
              <p className="text-slate-800 leading-relaxed whitespace-pre-line text-sm">
                {pilot.description || "Field deployment testbed implementing empirical validation."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">Specific Location</span>
                  <strong className="text-slate-800">{pilot.siteLocation}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Beneficiaries</span>
                  <strong className="text-emerald-700">
                    {pilot.actualBeneficiaryCount ?? pilot.targetBeneficiaryCount} Citizens
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Start Date</span>
                  <strong className="text-slate-800">
                    {pilot.actualStartDate
                      ? new Date(pilot.actualStartDate).toLocaleDateString()
                      : pilot.startDate
                      ? new Date(pilot.startDate).toLocaleDateString()
                      : "Pending"}
                  </strong>
                </div>
              </div>

              {pilot.risksRequirements && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <strong className="text-slate-700">Site Requirements / Risk Mitigations: </strong>
                  <span className="text-slate-600">{pilot.risksRequirements}</span>
                </div>
              )}
            </div>

            {/* Government Clearance & NOC Workflow */}
            <PilotClearanceCard
              pilotId={pilot.id}
              clearanceStatus={pilot.clearanceStatus}
              clearanceDocumentUrl={pilot.clearanceDocumentUrl}
              clearanceNotes={pilot.clearanceNotes}
              clearanceRequestedAt={pilot.clearanceRequestedAt}
              clearanceDecidedAt={pilot.clearanceDecidedAt}
              clearedBy={pilot.clearedBy}
              userRole={user?.role}
              isLeadOrResponsible={isLeadOrResponsible}
              token={token}
              onRefresh={fetchPilot}
            />

            {/* Empirical Metrics Table */}
            <PilotMetricsTable
              pilotId={pilot.id}
              metrics={pilot.metrics || []}
              userRole={user?.role}
              isLeadOrResponsible={isLeadOrResponsible}
              token={token}
              onRefresh={fetchPilot}
            />
          </div>

          {/* Right Column (4 cols): Field Verifications & Linked Entities */}
          <div className="lg:col-span-4 space-y-6">
            {/* Linked Project & Problem */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-500">
                Connected Civic Entities
              </h3>

              {pilot.project && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Parent Project</span>
                  <Link
                    to={`/projects/${pilot.projectId}`}
                    className="font-bold text-indigo-700 hover:underline block text-sm"
                  >
                    {pilot.project.title}
                  </Link>
                  <span className="text-slate-500 block">
                    Track: {pilot.project.trackType.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              {pilot.problem && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Addressed Problem</span>
                  <Link
                    to={`/problems/${pilot.problemId}`}
                    className="font-bold text-emerald-700 hover:underline block text-sm"
                  >
                    {pilot.problem.title}
                  </Link>
                  <span className="text-slate-500 block">
                    District: {pilot.problem.district} • Priority: {pilot.problem.priorityTier}
                  </span>
                </div>
              )}
            </div>

            {/* Multi-Stakeholder Field Verifications Feed */}
            <PilotVerificationFeed
              pilotId={pilot.id}
              verifications={pilot.verifications || []}
              userRole={user?.role}
              token={token}
              onRefresh={fetchPilot}
            />
          </div>
        </div>
      </main>

      {/* Impact Dossier Modal */}
      <PilotDossierModal
        pilotId={pilot.id}
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
      />
    </div>
  );
};

export default PilotDetailsPage;
