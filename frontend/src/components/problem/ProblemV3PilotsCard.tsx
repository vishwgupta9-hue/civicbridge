import React from "react";
import { Link } from "react-router-dom";
import { Activity, MapPin, Users, ChevronRight, CheckCircle2 } from "lucide-react";
import { PilotDeploymentRecord } from "../../types";

interface ProblemV3PilotsCardProps {
  pilots: PilotDeploymentRecord[];
}

export const ProblemV3PilotsCard: React.FC<ProblemV3PilotsCardProps> = ({ pilots }) => {
  const getPilotStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE_ON_GROUND":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "CONCLUDED":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "EVALUATION":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "PREPARATION":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "PROPOSED":
      default:
        return "bg-amber-100 text-amber-800 border-amber-300";
    }
  };

  const getClearanceBadge = (clearance: string) => {
    switch (clearance) {
      case "APPROVED":
      case "GRANTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "NOT_REQUIRED":
        return "bg-slate-50 text-slate-600 border-slate-200";
      case "REQUESTED":
      case "UNDER_REVIEW":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "REJECTED":
      case "DECLINED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Field Execution Pilots ({pilots.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Real-world deployments & empirical testbeds addressing this problem
          </span>
        </div>
      </div>

      {pilots.length === 0 ? (
        <div className="text-center py-6 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-1">
          <Activity className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">
            No on-ground pilots currently deployed for this problem.
          </p>
          <p className="text-[11px] text-slate-500">
            Pilots are initiated from approved Projects once solution architecture is finalized.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pilots.map((pilot) => (
            <Link
              key={pilot.id}
              to={`/pilots/${pilot.id}`}
              className="block p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPilotStatusColor(
                        pilot.status
                      )}`}
                    >
                      {pilot.status.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getClearanceBadge(
                        pilot.clearanceStatus
                      )}`}
                    >
                      NOC: {pilot.clearanceStatus.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                    {pilot.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {pilot.siteLocation}, {pilot.district}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {pilot.actualBeneficiaryCount ?? pilot.targetBeneficiaryCount} Beneficiaries
                    </span>
                    {pilot.metrics && pilot.metrics.length > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {pilot.metrics.length} Empirical Metric{pilot.metrics.length > 1 ? "s" : ""} Tracked
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2 text-slate-400 group-hover:text-indigo-600 transition-colors self-center">
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
