import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, PlusCircle, Building2, ChevronRight } from "lucide-react";
import { ProjectRecord, Role } from "../../types";

interface ProblemV3ProjectsCardProps {
  problemId?: string;
  problemTitle?: string;
  projects: ProjectRecord[];
  userRole?: Role;
  hasOrg: boolean;
  onOpenCreateProject: () => void;
}

export const ProblemV3ProjectsCard: React.FC<ProblemV3ProjectsCardProps> = ({
  projects,
  userRole,
  hasOrg,
  onOpenCreateProject,
}) => {
  const canCreateProject =
    hasOrg &&
    (userRole === "UNIVERSITY" ||
      userRole === "STARTUP" ||
      userRole === "INDUSTRY" ||
      userRole === "ADMIN");

  const getTrackBadge = (track: string) => {
    switch (track) {
      case "ACADEMIC_RESEARCH":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "COMMERCIAL_VENTURE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CIVIC_INITIATIVE":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "EXECUTION":
        return "bg-emerald-100 text-emerald-800";
      case "PILOT_READY":
        return "bg-purple-100 text-purple-800";
      case "RESOURCE_MATCHING":
        return "bg-indigo-100 text-indigo-800";
      case "PROPOSAL_READY":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              V3 Solution Projects ({projects.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Coordinated institutional initiatives addressing this challenge
            </span>
          </div>
        </div>

        {canCreateProject && (
          <button
            onClick={onOpenCreateProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Launch Project</span>
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-6 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-2">
          <Briefcase className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">
            No formal V3 Solution Projects currently address this problem.
          </p>
          {canCreateProject ? (
            <p className="text-[11px] text-slate-500">
              As a registered institutional solver, you can initiate the first project roadmap for this civic challenge.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Registered universities, startups, and industries can initiate solution projects.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj) => (
            <Link
              key={proj.id}
              to={`/projects/${proj.id}`}
              className="block p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getTrackBadge(
                        proj.trackType
                      )}`}
                    >
                      {proj.trackType.replace("_", " ")}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${getStatusBadge(
                        proj.status
                      )}`}
                    >
                      {proj.status.replace("_", " ")}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    {proj.title}
                  </h4>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {proj.executiveSummary}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <strong>Lead:</strong> {proj.leadOrg?.name || "Partner Organization"}
                    </span>
                    {proj.leadOrg?.district && (
                      <span>({proj.leadOrg.district})</span>
                    )}
                  </div>
                </div>

                <div className="p-2 text-slate-400 group-hover:text-emerald-600 transition-colors self-center">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
