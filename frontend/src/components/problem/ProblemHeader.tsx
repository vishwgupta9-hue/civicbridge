import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  MapPin,
  Users,
  Calendar,
  Layers,
  Copy,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PriorityTier, VerificationStatus, ProblemStatus } from "../../types";

interface ProblemHeaderProps {
  id: string;
  title: string;
  category: string;
  subCategory?: string | null;
  district: string;
  locationText?: string | null;
  affectedCount: number;
  priorityTier: PriorityTier;
  priorityScore: number;
  verificationStatus: VerificationStatus;
  status: ProblemStatus;
  createdAt: string;
}

export const ProblemHeader: React.FC<ProblemHeaderProps> = ({
  id,
  title,
  category,
  subCategory,
  district,
  locationText,
  affectedCount,
  priorityTier,
  priorityScore,
  verificationStatus,
  status,
  createdAt,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityBadge = (tier: PriorityTier) => {
    switch (tier) {
      case "HIGH":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (st: ProblemStatus) => {
    switch (st) {
      case "OPEN":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "IN_PROGRESS":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Back Link and ID */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            to="/problems"
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Statewide Problem Bank</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400">ID:</span>
            <button
              onClick={handleCopyId}
              className="font-mono text-slate-700 hover:text-emerald-700 bg-slate-100 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              title="Click to copy full UUID"
            >
              <span>{id.slice(0, 8)}...{id.slice(-4)}</span>
              <Copy className="w-3 h-3" />
            </button>
            {copied && <span className="text-emerald-600 text-[11px] font-semibold">Copied!</span>}
          </div>
        </div>

        {/* Title and Badges */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Pill */}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <Layers className="w-3 h-3 text-slate-500" />
              {category}
              {subCategory && ` • ${subCategory}`}
            </span>

            {/* Verification Status (Parallel Trust Model) */}
            {verificationStatus === "GOVERNMENT_VERIFIED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Government Verified
              </span>
            ) : verificationStatus === "DECLINED_BY_GOVT" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Declined by Govt
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                AI Screened (Advisory)
              </span>
            )}

            {/* Priority Tier */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadge(
                priorityTier
              )}`}
            >
              <AlertTriangle className="w-3 h-3" />
              Priority {priorityTier} ({priorityScore}/100)
            </span>

            {/* Lifecycle Status */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                status
              )}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {status}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
        </div>

        {/* Meta Details Row */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>
              {district}
              {locationText ? `, ${locationText}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{affectedCount.toLocaleString()} Citizens Impacted</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Reported {new Date(createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
