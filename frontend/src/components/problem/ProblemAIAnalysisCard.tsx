import React from "react";
import { Sparkles, AlertTriangle, Tag } from "lucide-react";

interface AIAnalysisProps {
  analysis: {
    id: string;
    aiSummary: string;
    predictedCategory: string;
    confidenceScore: number;
    severityScore: number;
    urgencyScore: number;
    aiUrgencyScore?: number;
    aiUrgencyReason: string;
    isDuplicate: boolean;
    duplicateCandidateTitle?: string | null;
    similarProblemIds?: string[];
    rootCauseHypotheses?: string[];
    requiredExpertise?: string[];
    departmentHints?: string[];
  } | null | undefined;
}

export const ProblemAIAnalysisCard: React.FC<AIAnalysisProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-500">
        <Sparkles className="w-5 h-5 text-slate-400 mx-auto mb-2" />
        <span>AI analysis is pending automated relevance screening.</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-white px-5 py-3.5 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              AI Relevance Screening & Advisory Insights
            </h3>
            <span className="text-[11px] text-purple-700 font-medium">
              Advisory analysis • Confidence: {Math.round((analysis.confidenceScore || 0.85) * 100)}%
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 uppercase tracking-wider">
          AI Advisory
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Duplicate Detection Alert if flagged */}
        {analysis.isDuplicate && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Potential Duplicate Detected</span>
            </div>
            <p className="text-amber-800">
              This issue shares high similarity with an existing community challenge:{" "}
              <strong>{analysis.duplicateCandidateTitle || "Related report"}</strong>.
            </p>
          </div>
        )}

        {/* AI Summary */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Executive AI Summary
          </h4>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            {analysis.aiSummary || "Problem analyzed for systemic infrastructure impact."}
          </p>
        </div>

        {/* Dimension Scores Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100 text-center">
            <span className="text-[10px] uppercase font-bold text-purple-700 block">Severity Score</span>
            <span className="text-lg font-extrabold text-purple-900">{analysis.severityScore}/100</span>
          </div>
          <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Urgency Score</span>
            <span className="text-lg font-extrabold text-indigo-900">
              {analysis.aiUrgencyScore ?? analysis.urgencyScore}/100
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Predicted Domain</span>
            <span className="text-xs font-bold text-slate-800 truncate block mt-1">
              {analysis.predictedCategory}
            </span>
          </div>
        </div>

        {/* Urgency Rationale */}
        {analysis.aiUrgencyReason && (
          <div className="text-xs text-slate-600">
            <strong className="text-slate-800">Urgency Rationale: </strong>
            <span>{analysis.aiUrgencyReason}</span>
          </div>
        )}

        {/* Root Cause Hypotheses */}
        {analysis.rootCauseHypotheses && analysis.rootCauseHypotheses.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Root Cause Hypotheses
            </h4>
            <ul className="space-y-1">
              {analysis.rootCauseHypotheses.map((hyp, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>{hyp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Academic & Technical Expertise Tags */}
        {analysis.requiredExpertise && analysis.requiredExpertise.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Recommended Expertise for Problem Solvers</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.requiredExpertise.map((exp, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                >
                  {exp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Government Disclaimer */}
        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
          Note: AI scoring is strictly advisory. Official administrative verification and fund allocation requires government authority sign-off.
        </p>
      </div>
    </div>
  );
};
