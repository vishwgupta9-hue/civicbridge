import React from "react";
import {
  FileText,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { VerificationStatus } from "../../types";

interface ProblemOverviewProps {
  description: string;
  district: string;
  locationText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  affectedCount: number;
  evidenceUrl?: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: {
    id: string;
    name: string;
    role: string;
    district?: string | null;
  } | null;
  submittedBy?: {
    id: string;
    name: string;
    role: string;
    district?: string | null;
  } | null;
}

export const ProblemOverview: React.FC<ProblemOverviewProps> = ({
  description,
  district,
  locationText,
  latitude,
  longitude,
  affectedCount,
  evidenceUrl,
  verificationStatus,
  verificationNotes,
  verifiedAt,
  verifiedBy,
  submittedBy,
}) => {
  return (
    <div className="space-y-6">
      {/* Problem Narrative Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Problem Description</span>
        </h3>
        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
          {description}
        </div>
      </div>

      {/* Field Evidence & Geographic Location Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location & Impact */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Geographic Footprint</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">District:</span>
              <span className="font-semibold text-slate-800">{district}</span>
            </div>
            {locationText && (
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Local Area / Landmark:</span>
                <span className="font-semibold text-slate-800">{locationText}</span>
              </div>
            )}
            {latitude != null && longitude != null && (
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">GPS Coordinates:</span>
                <span className="font-mono text-slate-700">
                  {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Estimated Affected Population:</span>
              <span className="font-bold text-emerald-700">{affectedCount.toLocaleString()} Citizens</span>
            </div>
          </div>
        </div>

        {/* Evidence & Submitter */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Submitted Evidence & Origin</span>
          </h3>
          <div className="space-y-3 text-xs">
            {evidenceUrl ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium truncate">Field Photo / Supporting Document</span>
                </div>
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 hover:underline ml-2 shrink-0"
                >
                  <span>View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 text-center">
                No external photo or document attachment uploaded.
              </div>
            )}

            {submittedBy && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                <span>Submitted by:</span>
                <span className="font-medium text-slate-800">
                  {submittedBy.name} ({submittedBy.district || "Jharkhand"})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Government Verification Card if Verified */}
      {verificationStatus === "GOVERNMENT_VERIFIED" && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official Government Verification Record</span>
          </div>
          <div className="text-xs text-emerald-800 space-y-1">
            <p>
              <strong>Status: </strong>
              Verified and confirmed as an authentic municipal priority by district administration.
            </p>
            {verificationNotes && (
              <p>
                <strong>Administrative Notes: </strong>
                <span>{verificationNotes}</span>
              </p>
            )}
            {verifiedAt && (
              <p className="text-[11px] text-emerald-700">
                Verified on {new Date(verifiedAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                {verifiedBy && ` by ${verifiedBy.name} (${verifiedBy.district || "District Official"})`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
