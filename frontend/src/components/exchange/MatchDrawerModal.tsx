import React, { useState, useEffect } from "react";
import { X, Sparkles, Handshake, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MatchResultItem } from "../../types";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { RequestCollabModal } from "./RequestCollabModal";

interface MatchDrawerModalProps {
  type: "need" | "offer";
  id: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MatchDrawerModal: React.FC<MatchDrawerModalProps> = ({
  type,
  id,
  title,
  isOpen,
  onClose,
}) => {
  const { token, user } = useAuth();
  const [matches, setMatches] = useState<MatchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [collabTarget, setCollabTarget] = useState<{
    targetOrgId: string;
    targetOrgName: string;
    itemTitle: string;
    needId?: string;
    offerId?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !token || !id) return;
    setIsLoading(true);
    setError(null);

    const endpoint =
      type === "need"
        ? `${API_BASE_URL}/needs/${id}/matches`
        : `${API_BASE_URL}/offers/${id}/matches`;

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.matches)) {
          setMatches(data.matches);
        } else {
          setError(data.error || "No compatible matches found.");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, id, type, token]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Deterministic Resource Matching
                </h3>
                <span className="text-[11px] text-purple-700 font-medium truncate max-w-[300px] block">
                  Context: {title}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Matches List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            {isLoading && (
              <div className="py-12 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 font-medium">Computing deterministic match compatibility scores...</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLoading && !error && matches.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No compatible exchange partners detected</p>
                <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                  Deterministic matching checks category alignment, district proximity, and specifications. New matching offers or needs will appear automatically once published.
                </p>
              </div>
            )}

            {!isLoading &&
              matches.map((item, i) => {
                const target = type === "need" ? item.offer : item.need;
                const targetOrg = type === "need" ? item.offer?.providerOrg : item.need?.creatorOrg;
                if (!target) return null;

                return (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50/20 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 uppercase">
                            {target.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {target.district}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{target.title}</h4>
                        <span className="text-[11px] text-slate-500 block">
                          Provided by: <strong>{targetOrg?.name || "Partner Organization"}</strong> ({targetOrg?.type})
                        </span>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                          {Math.round(item.score)}% Match
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-600 line-clamp-2">
                      {"specifications" in target ? target.specifications : (target as any).details}
                    </p>

                    {/* Breakdown factors */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Category: {item.breakdown.categoryMatch ? "100%" : "0%"}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        District Proximity: {item.breakdown.districtMatch ? "Local (Jharkhand)" : "Non-local"}
                      </span>
                      <span>Text Similarity: {Math.round(item.breakdown.textSimilarity * 100)}%</span>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setCollabTarget({
                            targetOrgId: targetOrg?.id || "",
                            targetOrgName: targetOrg?.name || "Partner Organization",
                            itemTitle: target.title,
                            needId: type === "need" ? id : target.id,
                            offerId: type === "offer" ? id : target.id,
                          });
                        }}
                        disabled={!user?.organizationId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-xs"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Request Collaboration</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {collabTarget && (
        <RequestCollabModal
          needId={collabTarget.needId}
          offerId={collabTarget.offerId}
          targetOrgId={collabTarget.targetOrgId}
          targetOrgName={collabTarget.targetOrgName}
          itemTitle={collabTarget.itemTitle}
          isOpen={true}
          onClose={() => setCollabTarget(null)}
          onSuccess={() => {
            setCollabTarget(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
